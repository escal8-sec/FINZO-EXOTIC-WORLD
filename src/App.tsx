/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { WishlistProvider } from './context/WishlistContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Preloader } from './components/Preloader';
import { HomePage } from './pages/HomePage';
import { FishCollectionPage } from './pages/FishCollectionPage';
import { AquariumShopPage } from './pages/AquariumShopPage';
import { CustomAquariumBuilderPage } from './pages/CustomAquariumBuilderPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { AboutPage } from './pages/AboutPage';
import { FishCarePage } from './pages/FishCarePage';
import { ContactPage } from './pages/ContactPage';
import { CartPage } from './pages/CartPage';
import { AccountPage } from './pages/AccountPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function GoogleMapsQuotaBanner() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3"
    >
      <span>
        Google Maps / Places API quota or billing limit reached. Map pin suggestions may be unavailable — you can still enter your Indian delivery address manually.{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline hover:text-amber-950"
        >
          Learn about Google Maps quota troubleshooting
        </a>
        .
      </span>
      <button
        type="button"
        onClick={() => setQuotaExceeded(false)}
        className="font-semibold underline cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="hidden sm:inline-flex fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full glass-panel border border-cyan-400/35 items-center justify-center text-cyan-300 hover:text-white hover:border-cyan-300 shadow-lg shadow-black/40 cursor-pointer"
          aria-label="Scroll back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function AppRoutes() {
  const { path } = useRouter();

  const renderPage = () => {
    if (path === '/') return <HomePage />;
    if (path === '/fish') return <FishCollectionPage />;
    if (path === '/aquariums') return <AquariumShopPage />;
    if (path === '/custom-aquarium') return <CustomAquariumBuilderPage />;
    if (path === '/about') return <AboutPage />;
    if (path === '/care') return <FishCarePage />;
    if (path === '/contact') return <ContactPage />;
    if (path === '/cart') return <CartPage />;
    if (path === '/account') return <AccountPage />;
    if (path === '/admin/login') return <AdminLoginPage />;
    if (path === '/admin' || path === '/admin/dashboard') return <AdminDashboardPage />;
    if (path.startsWith('/product/')) {
      const slug = path.replace('/product/', '');
      return <ProductDetailsPage slug={slug} />;
    }
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#040B16] text-slate-100">
      <Preloader />
      <GoogleMapsQuotaBanner />
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <ScrollToTopButton />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <RouterProvider>
          <AuthProvider>
            <CatalogProvider>
              <CartProvider>
                <WishlistProvider>
                  <AppRoutes />
                </WishlistProvider>
              </CartProvider>
            </CatalogProvider>
          </AuthProvider>
        </RouterProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
