import React, { useEffect, useState } from 'react';
import { Lock, LogOut, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useCatalog } from '../context/CatalogContext';
import { FinzoLogoMark } from '../components/Navbar';

export function AdminLoginPage() {
  const {
    user,
    authReady,
    isAdmin,
    adminRoleChecked,
    signingIn,
    authError,
    clearAuthError,
    signInWithEmailPassword,
    signInWithGoogle,
    signOutUser,
  } = useAuth();
  const { navigate } = useRouter();
  const { storeSettings } = useCatalog();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (authReady && user && adminRoleChecked && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [authReady, user, adminRoleChecked, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    const ok = await signInWithEmailPassword(email, password);
    if (ok) {
      navigate('/admin/dashboard');
    }
  };

  if (!authReady || (user && !adminRoleChecked)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center text-slate-400 text-sm">
        Verifying administrator security clearance...
      </div>
    );
  }

  if (user && adminRoleChecked && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-rose-300">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">
            Administrator Privilege Required
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            You are currently signed in as <span className="text-white">{user.email}</span>, which is a standard customer account and cannot access store administration.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="px-5 py-3 rounded-xl bg-amber-300 hover:bg-amber-200 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out &amp; Switch Account
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-3 rounded-xl border border-white/15 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 lg:py-24">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border border-amber-300/20">
        <div className="flex items-center gap-3">
          <FinzoLogoMark logoUrl={storeSettings.logoUrl} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              {storeSettings.storeName}
            </p>
            <h1 className="font-display text-3xl font-semibold text-white">
              Administrator Portal
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-300/85 leading-relaxed">
          Sign in with your authorized store owner email and password, or verified administrator Google account. All dashboard mutations are enforced by Firebase server-side security rules.
        </p>

        {authError && (
          <div className="rounded-xl bg-rose-500/12 border border-rose-400/35 px-4 py-3 text-xs text-rose-200 leading-relaxed">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Administrator Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                clearAuthError();
                setEmail(e.target.value);
              }}
              placeholder="owner@domain.com"
              className="w-full px-4 py-3 rounded-xl bg-[#040B16]/85 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                clearAuthError();
                setPassword(e.target.value);
              }}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#040B16]/85 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </label>

          <button
            type="submit"
            disabled={signingIn}
            className="w-full py-3.5 px-5 rounded-xl bg-amber-300 hover:bg-amber-200 text-[#040B16] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {signingIn ? 'Verifying Credentials...' : 'Sign In to Admin Dashboard'}
          </button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#061224] px-3 text-[11px] uppercase tracking-wider text-slate-400">
              Or Authorized Google Sign-In
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={signingIn}
          onClick={() => void signInWithGoogle()}
          className="w-full py-3 px-5 rounded-xl bg-cyan-400/12 hover:bg-cyan-400/20 border border-cyan-400/35 text-cyan-100 font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          Continue with Verified Admin Google Account
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
