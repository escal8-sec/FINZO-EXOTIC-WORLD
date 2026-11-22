import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  formatFirestoreUserError,
  googleProvider,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
  truncateText,
} from '../lib/firebase';
import { CustomerProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  customerProfile: CustomerProfile | null;
  profileLoaded: boolean;
  needsRegistration: boolean;
  isAdmin: boolean;
  adminRoleChecked: boolean;
  signingIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  completeRegistration: (data: {
    displayName: string;
    phone: string;
    aquariumFocus: string;
  }) => Promise<void>;
  updateCustomerProfile: (data: {
    displayName: string;
    phone: string;
    aquariumFocus: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRoleChecked, setAdminRoleChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setCustomerProfile(null);
        setProfileLoaded(true);
        setIsAdmin(false);
        setAdminRoleChecked(true);
      } else {
        setAdminRoleChecked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Verify admin role against trusted database doc or bootstrapped owner email
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    const verifyAdmin = async () => {
      if (user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
        if (!cancelled) {
          setIsAdmin(true);
          setAdminRoleChecked(true);
        }
        return;
      }
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (!cancelled) {
          setIsAdmin(Boolean(user.emailVerified && adminSnap.exists()));
          setAdminRoleChecked(true);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setAdminRoleChecked(true);
        }
      }
    };

    void verifyAdmin();
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // Listen to authenticated customer profile document
  useEffect(() => {
    if (!authReady || !user) return;
    setProfileLoaded(false);
    const path = `customers/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'customers', user.uid),
      (snap) => {
        if (snap.exists()) {
          setCustomerProfile(snap.data() as CustomerProfile);
        } else {
          setCustomerProfile(null);
        }
        setProfileLoaded(true);
      },
      (error) => {
        setProfileLoaded(true);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsub();
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signInWithEmailPassword = useCallback(async (email: string, password: string): Promise<boolean> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const signedUser = cred.user;
      if (!signedUser.emailVerified) {
        await signOut(auth);
        setAuthError(
          'Your administrator account email is not verified. Verify your email or sign in using your verified Google account.'
        );
        return false;
      }

      if (signedUser.email === BOOTSTRAPPED_ADMIN_EMAIL) {
        return true;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', signedUser.uid));
        if (adminSnap.exists()) {
          return true;
        }
      } catch {
        // Fall through to denial below
      }

      await signOut(auth);
      setAuthError('Access denied: this account does not have FINZO EXOTIC WORLD administrator privileges.');
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('auth/operation-not-allowed')) {
        setAuthError(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). Enable it there or use authorized Google Sign-In below.'
        );
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setAuthError('Invalid administrator email or password.');
      } else {
        setAuthError(msg);
      }
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const completeRegistration = useCallback(
    async (data: { displayName: string; phone: string; aquariumFocus: string }) => {
      if (!user) throw new Error('Authentication required');
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before completing registration.');
      }
      const path = `customers/${user.uid}`;
      const payload = {
        uid: user.uid,
        displayName: truncateText(data.displayName || user.displayName || 'Collector', 100),
        email: truncateText(user.email || '', 160),
        phone: truncateText(data.phone, 30),
        aquariumFocus: truncateText(data.aquariumFocus || 'Planted & Exotic Freshwater', 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'customers', user.uid), payload);
      } catch (error) {
        logFirestoreError(error, OperationType.CREATE, path);
        throw new Error(
          formatFirestoreUserError(error, 'Unable to complete registration. Please try again.')
        );
      }
    },
    [user]
  );

  const updateCustomerProfile = useCallback(
    async (data: { displayName: string; phone: string; aquariumFocus: string }) => {
      if (!user) throw new Error('Authentication required');
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before updating your profile.');
      }
      const path = `customers/${user.uid}`;
      try {
        await updateDoc(doc(db, 'customers', user.uid), {
          displayName: truncateText(data.displayName || 'Collector', 100),
          phone: truncateText(data.phone, 30),
          aquariumFocus: truncateText(data.aquariumFocus || 'Planted & Exotic Freshwater', 120),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        logFirestoreError(error, OperationType.UPDATE, path);
        throw new Error(
          formatFirestoreUserError(error, 'Unable to update profile. Please try again.')
        );
      }
    },
    [user]
  );

  const needsRegistration = Boolean(user && profileLoaded && !customerProfile);

  const value = useMemo(
    () => ({
      user,
      authReady,
      customerProfile,
      profileLoaded,
      needsRegistration,
      isAdmin,
      adminRoleChecked,
      signingIn,
      authError,
      clearAuthError: () => setAuthError(null),
      signInWithGoogle,
      signInWithEmailPassword,
      signOutUser,
      completeRegistration,
      updateCustomerProfile,
    }),
    [
      user,
      authReady,
      customerProfile,
      profileLoaded,
      needsRegistration,
      isAdmin,
      adminRoleChecked,
      signingIn,
      authError,
      signInWithGoogle,
      signInWithEmailPassword,
      signOutUser,
      completeRegistration,
      updateCustomerProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
