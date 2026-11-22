import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';

export function Preloader() {
  const prefersReduced = useReducedMotion();
  const { storeSettings } = useCatalog();
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('finzo_preloader_seen') !== '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    if (prefersReduced) {
      setVisible(false);
      try {
        sessionStorage.setItem('finzo_preloader_seen', '1');
      } catch {
        // ignore storage errors
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('finzo_preloader_seen', '1');
      } catch {
        // ignore storage errors
      }
    }, 680);

    return () => window.clearTimeout(timer);
  }, [visible, prefersReduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="finzo-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#030812] px-6 pointer-events-none select-none"
          aria-hidden="true"
        >
          {/* Ambient radial glow */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(circle at 50% 44%, rgba(34, 211, 238, 0.14) 0%, rgba(14, 165, 233, 0.04) 38%, transparent 70%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center gap-4"
          >
            {/* Brand crest */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <motion.svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="29"
                  stroke="url(#preloaderGold)"
                  strokeWidth="1.2"
                  strokeDasharray="110 42"
                />
                <defs>
                  <linearGradient id="preloaderGold" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
                    <stop offset="65%" stopColor="#22D3EE" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </motion.svg>

              <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                fill="none"
                className="absolute"
              >
                <path
                  d="M8.5 16.5 C12.5 10.5 19.5 10 24.5 16 C19.5 22 12.5 21.5 8.5 16.5 Z"
                  fill="#22D3EE"
                  fillOpacity="0.24"
                  stroke="#22D3EE"
                  strokeWidth="1.5"
                />
                <path d="M8.5 16.5 L4.5 12.5 L6 16.5 L4.5 20.5 Z" fill="#D4AF37" />
                <circle cx="20.2" cy="15.3" r="1.2" fill="#F8FAFC" />
              </svg>
            </div>

            <div className="space-y-1">
              <p className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.2em] text-white">
                {storeSettings.storeName}
              </p>
              <p className="text-xs tracking-[0.18em] uppercase text-cyan-300/80">
                {storeSettings.tagline}
              </p>
            </div>

            {/* Smooth water-line sweep */}
            <div className="w-40 h-[2px] rounded-full bg-white/10 overflow-hidden mt-1">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
