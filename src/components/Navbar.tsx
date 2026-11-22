import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Layers,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { useRouter } from '../context/RouterContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, getEffectiveProductPrice } from '../lib/currency';
import { sanitizeAssetUrl } from '../lib/firebase';
import { ResilientImage } from './ResilientImage';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Fish', path: '/fish' },
  { label: 'Aquariums', path: '/aquariums' },
  { label: 'Custom Tank', path: '/custom-aquarium', highlight: true },
  { label: 'Care', path: '/care' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export function FinzoLogoMark({ logoUrl }: { logoUrl?: string }) {
  const safeLogoUrl = sanitizeAssetUrl(logoUrl);
  if (safeLogoUrl) {
    return (
      <img
        src={safeLogoUrl}
        alt="Store mark"
        className="w-7 h-7 rounded-full object-cover border border-amber-300/50"
      />
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="#D4AF37" strokeOpacity="0.65" strokeWidth="1.2" />
      <path
        d="M8.5 16.5 C12.5 10.5 19.5 10 24.5 16 C19.5 22 12.5 21.5 8.5 16.5 Z"
        fill="#22D3EE"
        fillOpacity="0.22"
        stroke="#22D3EE"
        strokeWidth="1.5"
      />
      <path d="M8.5 16.5 L4.5 12.5 L6 16.5 L4.5 20.5 Z" fill="#D4AF37" />
      <circle cx="20.2" cy="15.3" r="1.2" fill="#F8FAFC" />
    </svg>
  );
}

export function Navbar() {
  const { path, navigate } = useRouter();
  const { totalItems, openDrawer } = useCart();
  const { products, activeCategories, storeSettings } = useCatalog();
  const { user, customerProfile, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const prevCartItemsRef = useRef(totalItems);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    if (totalItems > prevCartItemsRef.current) {
      setCartBump(true);
      const t = window.setTimeout(() => setCartBump(false), 360);
      prevCartItemsRef.current = totalItems;
      return () => window.clearTimeout(t);
    }
    prevCartItemsRef.current = totalItems;
  }, [totalItems]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
        setCategoriesOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const visibleProducts = products.filter((item) => item.isAvailable !== false);
    if (!q) return visibleProducts.slice(0, 4);
    return visibleProducts
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.scientificName && item.scientificName.toLowerCase().includes(q)) ||
          item.originOrMaterial.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchTerm, products]);

  const handleNav = (target: string) => {
    setMobileOpen(false);
    setSearchOpen(false);
    setCategoriesOpen(false);
    navigate(target);
  };

  const accountLabel = user
    ? (customerProfile?.displayName || user.displayName || 'Account').split(' ')[0]
    : 'Sign In';

  const fishCats = activeCategories.filter((c) => c.kind === 'fish');
  const aqCats = activeCategories.filter((c) => c.kind === 'aquarium');

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-colors duration-300 border-b ${
          scrolled
            ? 'bg-[#040B16]/94 backdrop-blur-xl border-white/15 shadow-lg shadow-black/30'
            : 'bg-[#040B16]/65 backdrop-blur-lg border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] sm:h-[68px] flex items-center justify-between gap-3 lg:gap-5">
          {/* Zone 1: Brand Wordmark */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => handleNav('/')}
            className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md py-1 group"
          >
            <span className="transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
              <FinzoLogoMark logoUrl={storeSettings.logoUrl} />
            </span>
            <span className="font-display text-base sm:text-xl font-semibold tracking-[0.12em] text-white whitespace-nowrap shrink-0 group-hover:text-cyan-200 transition-colors">
              {storeSettings.storeName}
            </span>
          </motion.button>

          {/* Zone 2: Clean single-line navigation links + Dynamic Categories popover */}
          <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? path === '/'
                  : path === item.path || (item.path === '/fish' && path.startsWith('/product/'));

              if (item.highlight) {
                return (
                  <motion.button
                    key={item.path}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => handleNav(item.path)}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-cyan-400 text-[#040B16] border-cyan-300 shadow-md shadow-cyan-500/20'
                        : 'bg-cyan-400/12 text-cyan-200 border-cyan-400/35 hover:bg-cyan-400/20 hover:text-white'
                    }`}
                  >
                    Build Your Custom Aquarium
                  </motion.button>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`group/nav relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded ${
                    isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active-underline"
                      className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-gradient-to-r from-cyan-400 to-amber-300/80 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : (
                    <span
                      className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-cyan-300/60 rounded-full scale-x-0 group-hover/nav:scale-x-100 origin-left transition-transform duration-200"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}

            {/* Dynamic Firestore Categories Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoriesOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 py-1.5 text-sm font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                aria-expanded={categoriesOpen}
              >
                <Layers className="w-3.5 h-3.5 text-amber-300/80" />
                Categories
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {categoriesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[520px] glass-panel rounded-2xl p-5 shadow-2xl border border-white/15 grid grid-cols-2 gap-5"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-cyan-300 font-semibold mb-2">
                        Exotic Fish Categories
                      </p>
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {fishCats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              handleNav(`/fish?category=${encodeURIComponent(cat.name)}`)
                            }
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-cyan-400/15 hover:text-cyan-200 hover:translate-x-0.5 transition-all cursor-pointer flex items-center justify-between"
                          >
                            <span>{cat.name}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-amber-200 font-semibold mb-2">
                        Aquarium &amp; Supplies
                      </p>
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {aqCats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              handleNav(`/aquariums?category=${encodeURIComponent(cat.name)}`)
                            }
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-amber-300/15 hover:text-amber-200 hover:translate-x-0.5 transition-all cursor-pointer flex items-center justify-between"
                          >
                            <span>{cat.name}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Zone 3: Search, Account/Admin & Shopping Bag Action */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-lg border border-white/10 hover:border-cyan-400/35 hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Search exotic fish and aquariums"
            >
              <Search className="w-4 h-4" />
            </motion.button>

            {isAdmin && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNav('/admin/dashboard')}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  path.startsWith('/admin')
                    ? 'bg-amber-300 text-[#040B16] border-amber-200'
                    : 'border-amber-300/35 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </motion.button>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNav('/account')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                path === '/account'
                  ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
                  : 'border-white/12 text-slate-200 hover:border-white/30 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-cyan-300" />
              <span className="max-w-[90px] truncate">{accountLabel}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              animate={cartBump ? { scale: [1, 1.07, 1] } : { scale: 1 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={openDrawer}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-[#0B1E3B] hover:bg-cyan-400/15 border border-cyan-400/30 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label={`Open shopping cart with ${totalItems} items`}
            >
              <ShoppingBag className="w-4 h-4 text-cyan-300" />
              <span className="hidden md:inline">Bag</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  className="font-mono text-xs tabular-nums text-cyan-200 bg-cyan-400/15 px-1.5 py-0.5 rounded inline-block"
                >
                  {totalItems}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2.5 rounded-lg border border-white/10 text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Smooth GPU Scroll Progress Hairline */}
        <motion.div
          style={{ scaleX }}
          className="h-[2px] w-full origin-left bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300/80 opacity-75 pointer-events-none"
          aria-hidden="true"
        />

        {/* Mobile Drawer Navigation */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden border-t border-white/10 bg-[#040B16]/96 backdrop-blur-xl px-4 py-4 space-y-3"
              aria-label="Mobile"
            >
              <button
                type="button"
                onClick={() => handleNav('/custom-aquarium')}
                className="w-full px-4 py-3 rounded-xl bg-cyan-400 text-[#040B16] text-sm font-semibold text-center cursor-pointer btn-tactile"
              >
                Build Your Custom Aquarium
              </button>

              <div className="grid grid-cols-2 gap-2">
                {NAV_ITEMS.filter((i) => !i.highlight).map((item) => {
                  const isActive = path === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNav(item.path)}
                      className={`px-3.5 py-3 rounded-lg text-left text-sm font-medium transition-colors cursor-pointer btn-tactile ${
                        isActive
                          ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleNav('/account')}
                  className={`px-3.5 py-3 rounded-lg text-left text-sm font-medium transition-colors cursor-pointer btn-tactile ${
                    path === '/account'
                      ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {user ? 'My Account' : 'Sign In / Register'}
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/cart')}
                  className={`px-3.5 py-3 rounded-lg text-left text-sm font-medium transition-colors cursor-pointer btn-tactile ${
                    path === '/cart'
                      ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Cart ({totalItems})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNav('/admin/dashboard')}
                    className="col-span-2 px-3.5 py-3 rounded-lg text-left text-sm font-semibold bg-amber-300/15 text-amber-200 border border-amber-300/30 cursor-pointer btn-tactile"
                  >
                    Admin Dashboard
                  </button>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Quick Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-[#02060D]/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-2xl glass-panel rounded-2xl overflow-hidden shadow-2xl"
              role="dialog"
              aria-label="Search catalog"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                <Search className="w-4 h-4 text-cyan-300 shrink-0" />
                <input
                  type="search"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Discus, Betta, Arowana, Rimless Tanks..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-3 space-y-1.5">
                {searchResults.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No matching specimens or aquarium systems found.
                  </p>
                ) : (
                  searchResults.map((item) => {
                    const { currentPrice } = getEffectiveProductPrice(item);
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => handleNav(`/product/${item.slug}`)}
                        className="w-full p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-3.5 text-left transition-colors cursor-pointer group"
                      >
                        <div className="w-16 rounded-lg overflow-hidden shrink-0">
                          <ResilientImage
                            src={item.image}
                            alt={item.name}
                            aspectClassName="aspect-[4/3]"
                            className="transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {item.category} · {item.highlightSpec}
                          </p>
                        </div>
                        <span className="font-mono text-sm text-cyan-200 tabular-nums shrink-0">
                          {formatINR(currentPrice)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
