import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
  sanitizeId,
  truncateText,
} from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { useRouter } from './RouterContext';
import { Product, WishlistEntry } from '../types';

interface WishlistContextValue {
  items: WishlistEntry[];
  wishlistNotice: string | null;
  clearWishlistNotice: () => void;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  removeWishlistItem: (wishlistId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const { isUsingDemoFallback } = useCatalog();
  const { navigate } = useRouter();
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [wishlistNotice, setWishlistNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setItems([]);
      return;
    }

    const q = query(collection(db, 'wishlists'), where('customerId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ ...(d.data() as WishlistEntry), id: d.id })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'wishlists');
      }
    );

    return () => unsub();
  }, [authReady, user]);

  const isWishlisted = useCallback(
    (productId: string) => items.some((entry) => entry.productId === productId),
    [items]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (!user) {
        navigate('/account');
        return;
      }
      if (!user.emailVerified) {
        setWishlistNotice('Please verify your account email before saving wishlist items.');
        return;
      }
      if (isUsingDemoFallback) {
        setWishlistNotice(
          'Seed the demo catalog from the Admin Dashboard before saving wishlist items to Firestore.'
        );
        return;
      }

      const wishlistId = sanitizeId(`${user.uid}_${product.id}`, 200);
      const existing = items.find((entry) => entry.productId === product.id);
      const path = `wishlists/${wishlistId}`;

      try {
        setWishlistNotice(null);
        if (existing) {
          await deleteDoc(doc(db, 'wishlists', existing.id));
        } else {
          await setDoc(doc(db, 'wishlists', wishlistId), {
            id: wishlistId,
            customerId: user.uid,
            productId: sanitizeId(product.id, 128),
            productName: truncateText(product.name, 120),
            productSlug: truncateText(product.slug, 128),
            productImage: truncateText(product.image, 2048),
            price: Number(product.price),
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        logFirestoreError(error, OperationType.WRITE, path);
        setWishlistNotice(
          formatFirestoreUserError(error, 'Unable to update wishlist right now. Please try again.')
        );
      }
    },
    [user, items, isUsingDemoFallback, navigate]
  );

  const removeWishlistItem = useCallback(async (wishlistId: string) => {
    const path = `wishlists/${wishlistId}`;
    try {
      setWishlistNotice(null);
      await deleteDoc(doc(db, 'wishlists', wishlistId));
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, path);
      setWishlistNotice(
        formatFirestoreUserError(error, 'Unable to remove wishlist item. Please try again.')
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      wishlistNotice,
      clearWishlistNotice: () => setWishlistNotice(null),
      isWishlisted,
      toggleWishlist,
      removeWishlistItem,
    }),
    [items, wishlistNotice, isWishlisted, toggleWishlist, removeWishlistItem]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
