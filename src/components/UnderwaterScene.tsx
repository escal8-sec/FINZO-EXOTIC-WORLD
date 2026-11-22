import { motion, MotionValue, useReducedMotion } from 'motion/react';
import { ASSETS } from '../data/catalog';

interface SwimmerConfig {
  id: string;
  top: string;
  scale: number;
  direction: 'ltr' | 'rtl';
  duration: number;
  delay: number;
  opacity: number;
  depthBlur?: string;
  species: 'discus' | 'betta' | 'angel' | 'tetra';
}

const SWIMMERS: SwimmerConfig[] = [
  // Distant background depth plane
  { id: 'bg-tetra-1', top: '20%', scale: 0.42, direction: 'ltr', duration: 28, delay: -8, opacity: 0.48, depthBlur: 'blur-[0.6px]', species: 'tetra' },
  { id: 'bg-tetra-2', top: '23%', scale: 0.38, direction: 'ltr', duration: 29, delay: -9.5, opacity: 0.44, depthBlur: 'blur-[0.6px]', species: 'tetra' },
  { id: 'bg-discus-far', top: '70%', scale: 0.62, direction: 'rtl', duration: 42, delay: -24, opacity: 0.52, depthBlur: 'blur-[0.7px]', species: 'discus' },

  // Midground depth plane
  { id: 'discus-1', top: '28%', scale: 1.04, direction: 'ltr', duration: 32, delay: -5, opacity: 0.9, species: 'discus' },
  { id: 'angel-1', top: '44%', scale: 0.94, direction: 'rtl', duration: 37, delay: -14, opacity: 0.88, species: 'angel' },
  { id: 'tetra-mid-1', top: '54%', scale: 0.56, direction: 'rtl', duration: 23, delay: -10, opacity: 0.84, species: 'tetra' },
  { id: 'tetra-mid-2', top: '58%', scale: 0.5, direction: 'rtl', duration: 24, delay: -11.4, opacity: 0.78, species: 'tetra' },

  // Foreground depth plane
  { id: 'betta-1', top: '66%', scale: 0.86, direction: 'ltr', duration: 27, delay: -18, opacity: 0.94, species: 'betta' },
  { id: 'tetra-fg-1', top: '36%', scale: 0.6, direction: 'ltr', duration: 20, delay: -2.5, opacity: 0.9, species: 'tetra' },
];

const BUBBLES = [
  { id: 'b1', left: '7%', size: 5, duration: 11, delay: 0 },
  { id: 'b2', left: '14%', size: 9, duration: 14, delay: 2.5 },
  { id: 'b3', left: '22%', size: 4, duration: 9.5, delay: 5 },
  { id: 'b4', left: '36%', size: 7, duration: 13, delay: 1.4 },
  { id: 'b5', left: '53%', size: 5, duration: 10.5, delay: 4.1 },
  { id: 'b6', left: '65%', size: 10, duration: 15, delay: 0.8 },
  { id: 'b7', left: '75%', size: 5, duration: 12, delay: 3.3 },
  { id: 'b8', left: '84%', size: 8, duration: 13.5, delay: 6.2 },
  { id: 'b9', left: '91%', size: 6, duration: 10, delay: 2 },
  { id: 'b10', left: '46%', size: 4, duration: 11.5, delay: 7 },
];

const LIGHT_MOTES = [
  { id: 'm1', left: '18%', top: '24%', size: 3, duration: 9 },
  { id: 'm2', left: '32%', top: '42%', size: 2.5, duration: 11 },
  { id: 'm3', left: '48%', top: '18%', size: 3.5, duration: 13 },
  { id: 'm4', left: '61%', top: '56%', size: 2.5, duration: 10 },
  { id: 'm5', left: '74%', top: '32%', size: 3, duration: 12 },
  { id: 'm6', left: '85%', top: '48%', size: 2, duration: 8.5 },
  { id: 'm7', left: '27%', top: '68%', size: 2.5, duration: 11.5 },
  { id: 'm8', left: '55%', top: '74%', size: 3, duration: 14 },
];

function ExoticFishSvg({ species }: { species: SwimmerConfig['species'] }) {
  if (species === 'discus') {
    return (
      <svg width="118" height="92" viewBox="0 0 118 92" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="discusBodyGrad" x1="18" y1="14" x2="96" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0C4A6E" />
            <stop offset="45%" stopColor="#0891B2" />
            <stop offset="78%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="discusFinGrad" x1="0" y1="0" x2="45" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <g className="animate-tail">
          <path d="M27 46 L5 29 C11 40 11 52 5 63 Z" fill="url(#discusFinGrad)" />
        </g>
        <path d="M40 17 C62 4 89 15 95 36 L34 36 Z" fill="url(#discusFinGrad)" />
        <path d="M40 75 C62 88 89 77 95 56 L34 56 Z" fill="url(#discusFinGrad)" />
        <ellipse cx="64" cy="46" rx="35" ry="29" fill="url(#discusBodyGrad)" />
        <path d="M44 25 C56 21 74 23 85 32" stroke="#A5F3FC" strokeWidth="2.1" strokeOpacity="0.72" strokeLinecap="round" />
        <path d="M38 35 C54 31 76 33 91 41" stroke="#67E8F9" strokeWidth="2.3" strokeOpacity="0.78" strokeLinecap="round" />
        <path d="M36 46 C54 43 76 44 94 48" stroke="#A5F3FC" strokeWidth="2.1" strokeOpacity="0.68" strokeLinecap="round" />
        <path d="M39 57 C56 54 74 55 90 58" stroke="#67E8F9" strokeWidth="2.1" strokeOpacity="0.72" strokeLinecap="round" />
        <path d="M48 66 C60 67 74 66 82 63" stroke="#2DD4BF" strokeWidth="1.8" strokeOpacity="0.68" strokeLinecap="round" />
        <path d="M72 48 C63 45 58 51 62 57 C67 56 72 53 72 48 Z" fill="#E0F2FE" fillOpacity="0.28" />
        <circle cx="85" cy="41" r="4.4" fill="#F59E0B" />
        <circle cx="86" cy="41" r="2.2" fill="#020617" />
        <circle cx="87" cy="40" r="0.9" fill="#FFFFFF" />
      </svg>
    );
  }

  if (species === 'angel') {
    return (
      <svg width="98" height="108" viewBox="0 0 98 108" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="angelSilverGrad" x1="25" y1="20" x2="82" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="55%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <path d="M46 40 L22 4 C40 15 58 26 65 42 Z" fill="url(#angelSilverGrad)" fillOpacity="0.86" />
        <path d="M46 68 L20 104 C40 92 58 81 65 66 Z" fill="url(#angelSilverGrad)" fillOpacity="0.86" />
        <g className="animate-tail">
          <path d="M28 54 L8 40 C13 49 13 59 8 68 Z" fill="#CBD5E1" fillOpacity="0.62" />
        </g>
        <path d="M28 54 C40 31 65 33 82 54 C65 75 40 77 28 54 Z" fill="url(#angelSilverGrad)" />
        <path d="M43 38 L40 70" stroke="#0F172A" strokeWidth="4.5" strokeOpacity="0.8" strokeLinecap="round" />
        <path d="M57 37 L54 71" stroke="#0F172A" strokeWidth="4.8" strokeOpacity="0.82" strokeLinecap="round" />
        <path d="M70 44 L68 64" stroke="#0F172A" strokeWidth="3.2" strokeOpacity="0.75" strokeLinecap="round" />
        <circle cx="72" cy="51" r="3" fill="#D4AF37" />
        <circle cx="73" cy="51" r="1.5" fill="#020617" />
      </svg>
    );
  }

  if (species === 'betta') {
    return (
      <svg width="108" height="76" viewBox="0 0 108 76" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bettaVeilGrad" x1="6" y1="10" x2="64" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
            <stop offset="52%" stopColor="#F59E0B" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <g className="animate-tail">
          <path d="M48 38 C28 10 8 12 4 38 C8 64 28 66 48 38 Z" fill="url(#bettaVeilGrad)" />
        </g>
        <path d="M46 27 C42 12 64 12 72 29 Z" fill="#38BDF8" fillOpacity="0.8" />
        <path d="M44 46 C40 63 65 65 74 45 Z" fill="#FBBF24" fillOpacity="0.68" />
        <path d="M44 38 C56 26 80 27 94 38 C80 49 56 50 44 38 Z" fill="#0F172A" />
        <path d="M50 38 C60 31 76 32 86 38 C76 44 60 45 50 38 Z" fill="#22D3EE" fillOpacity="0.72" />
        <circle cx="84" cy="36" r="2.7" fill="#FDE68A" />
        <circle cx="85" cy="36" r="1.3" fill="#020617" />
      </svg>
    );
  }

  return (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none" aria-hidden="true">
      <g className="animate-tail">
        <path d="M13 15 L2 8 L5 15 L2 22 Z" fill="#94A3B8" fillOpacity="0.58" />
      </g>
      <path d="M11 15 C19 7 40 8 52 15 C40 22 19 23 11 15 Z" fill="#0F172A" />
      <path d="M15 13 C26 10 39 11 49 14" stroke="#22D3EE" strokeWidth="2.9" strokeLinecap="round" />
      <path d="M15 17 C25 19 36 19 42 17" stroke="#F43F5E" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="46" cy="14" r="1.9" fill="#E2E8F0" />
      <circle cx="46.5" cy="14" r="0.95" fill="#020617" />
    </svg>
  );
}

interface UnderwaterSceneProps {
  backdropY?: MotionValue<number>;
  raysY?: MotionValue<number>;
  plantsY?: MotionValue<number>;
}

export function UnderwaterScene({ backdropY, raysY, plantsY }: UnderwaterSceneProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Parallax Depth Layer 1: Base deep underwater aquascape photograph */}
      <motion.div
        style={backdropY && !prefersReduced ? { y: backdropY } : undefined}
        className="absolute -inset-y-14 inset-x-0 will-change-transform"
      >
        <img
          src={ASSETS.heroReef}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-50 scale-[1.06]"
        />
      </motion.div>

      {/* Layered deep ocean navy & turquoise depth scrims */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(3,9,19,0.78) 0%, rgba(4,14,30,0.48) 46%, rgba(4,11,22,0.95) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 68% 22%, rgba(34,211,238,0.2) 0%, rgba(14,165,233,0.08) 40%, transparent 72%)',
        }}
      />

      {/* Caustic water surface shimmer */}
      <div
        className="animate-caustic absolute -top-14 left-0 right-0 h-56"
        style={{
          background:
            'radial-gradient(ellipse 68% 58% at 54% 0%, rgba(165, 243, 252, 0.28), rgba(34, 211, 238, 0.09) 55%, transparent 82%)',
        }}
      />

      {/* Parallax Depth Layer 2: Volumetric underwater god-rays */}
      <motion.div
        style={raysY && !prefersReduced ? { y: raysY } : undefined}
        className="absolute inset-0 overflow-hidden will-change-transform"
      >
        <div
          className="animate-ray-slow absolute -top-20 left-[14%] w-44 h-[125%]"
          style={{
            background:
              'linear-gradient(180deg, rgba(165,243,252,0.24) 0%, rgba(34,211,238,0.06) 55%, transparent 90%)',
            filter: 'blur(20px)',
          }}
        />
        <div
          className="animate-ray-slower absolute -top-24 left-[46%] w-72 h-[130%]"
          style={{
            background:
              'linear-gradient(180deg, rgba(186,230,253,0.26) 0%, rgba(56,189,248,0.08) 54%, transparent 90%)',
            filter: 'blur(24px)',
          }}
        />
        <div
          className="animate-ray-slow absolute -top-16 right-[12%] w-40 h-[120%]"
          style={{
            background:
              'linear-gradient(180deg, rgba(212,175,55,0.14) 0%, rgba(34,211,238,0.06) 55%, transparent 90%)',
            filter: 'blur(22px)',
          }}
        />
      </motion.div>

      {/* Drifting underwater micro-light motes */}
      {!prefersReduced &&
        LIGHT_MOTES.map((mote) => (
          <motion.span
            key={mote.id}
            className="absolute rounded-full bg-cyan-100/50"
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
            }}
            animate={{
              y: [0, -18, 8, 0],
              x: [0, 12, -10, 0],
              opacity: [0.18, 0.55, 0.25, 0.18],
            }}
            transition={{
              duration: mote.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* Continuously swimming exotic fish across 3 depth planes */}
      {!prefersReduced &&
        SWIMMERS.map((fish) => {
          const startX = fish.direction === 'ltr' ? '-16vw' : '114vw';
          const endX = fish.direction === 'ltr' ? '114vw' : '-16vw';
          return (
            <motion.div
              key={fish.id}
              className={`absolute left-0 ${fish.depthBlur ?? ''}`}
              style={{ top: fish.top, opacity: fish.opacity }}
              initial={{ x: startX, y: 0 }}
              animate={{
                x: [startX, endX],
                y: [0, -16, 12, -9, 0],
                rotate: fish.direction === 'ltr' ? [0, -2.2, 1.8, -1, 0] : [0, 2.2, -1.8, 1, 0],
              }}
              transition={{
                x: {
                  duration: fish.duration,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: fish.delay,
                },
                y: {
                  duration: 8.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
                rotate: {
                  duration: 8.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
            >
              <div
                style={{
                  transform: `scale(${fish.scale}) ${fish.direction === 'rtl' ? 'scaleX(-1)' : ''}`,
                }}
              >
                <ExoticFishSvg species={fish.species} />
              </div>
            </motion.div>
          );
        })}

      {/* Specular rising underwater bubbles */}
      {!prefersReduced &&
        BUBBLES.map((bubble) => (
          <motion.span
            key={bubble.id}
            className="absolute bottom-[-24px] rounded-full border border-cyan-100/50 bg-cyan-200/15"
            style={{
              left: bubble.left,
              width: bubble.size,
              height: bubble.size,
            }}
            animate={{
              y: [0, -960],
              x: [0, 12, -10, 14],
              opacity: [0, 0.7, 0.5, 0],
            }}
            transition={{
              duration: bubble.duration,
              repeat: Infinity,
              delay: bubble.delay,
              ease: 'linear',
            }}
          />
        ))}

      {/* Parallax Depth Layer 3: Layered swaying aquatic plants */}
      <motion.div
        style={plantsY && !prefersReduced ? { y: plantsY } : undefined}
        className="absolute inset-0 pointer-events-none will-change-transform"
      >
        <svg
          className="animate-plant-sway absolute bottom-0 left-0 w-44 sm:w-64 h-48 sm:h-64 opacity-45"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M24 200 C18 140 42 90 18 28 C34 78 44 132 36 200 Z" fill="#0F4C5C" />
          <path d="M52 200 C66 135 38 80 68 18 C70 86 78 140 66 200 Z" fill="#134E4A" />
          <path d="M88 200 C78 150 105 110 92 52 C110 102 108 152 100 200 Z" fill="#0D3B4C" />
        </svg>

        <svg
          className="animate-plant-sway absolute bottom-0 right-0 w-44 sm:w-64 h-44 sm:h-60 opacity-40"
          style={{ animationDelay: '-3.2s' }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M174 200 C182 140 156 92 182 32 C164 82 154 134 162 200 Z" fill="#0F4C5C" />
          <path d="M142 200 C128 138 158 84 128 24 C126 88 118 142 130 200 Z" fill="#134E4A" />
        </svg>
      </motion.div>
    </div>
  );
}
