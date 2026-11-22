import { useState } from 'react';
import { Droplets, ShieldCheck, Thermometer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from '../context/RouterContext';
import { Reveal, StaggerGrid, StaggerItem } from '../components/Reveal';

interface SpeciesGuide {
  id: string;
  label: string;
  temp: string;
  ph: string;
  gh: string;
  minTank: string;
  waterChange: string;
  diet: string;
  notes: string;
}

const CARE_GUIDES: SpeciesGuide[] = [
  {
    id: 'discus',
    label: 'Royal & Cobalt Discus',
    temp: '28°C – 30°C',
    ph: '6.0 – 6.8',
    gh: '2 – 6 dGH',
    minTank: '220 Liters+',
    waterChange: '30% twice weekly',
    diet: 'High-protein granules, bloodworms, spirulina',
    notes:
      'Keep in calm groups of five or more with low-turbulence lily pipe outflow and warm, pristine remineralized water.',
  },
  {
    id: 'betta',
    label: 'Show Halfmoon Betta',
    temp: '25°C – 28°C',
    ph: '6.5 – 7.4',
    gh: '4 – 10 dGH',
    minTank: '20 Liters+',
    waterChange: '25% weekly',
    diet: 'Insect-based micro pellets, daphnia, brine shrimp',
    notes:
      'Gentle baffled filtration protects long halfmoon fins. Indian Almond leaves release soothing natural tannins.',
  },
  {
    id: 'angelfish',
    label: 'Orinoco Altum & Angels',
    temp: '25°C – 29°C',
    ph: '5.8 – 7.0',
    gh: '2 – 8 dGH',
    minTank: '180 – 250 Liters (Tall)',
    waterChange: '25% – 30% weekly',
    diet: 'Omnivorous flakes, mysis shrimp, frozen krill',
    notes:
      'Prioritize vertical tank height (60 cm+) and tall submerged driftwood for confident territory establishment.',
  },
  {
    id: 'tetras',
    label: 'Cardinal & Shoaling Tetras',
    temp: '24°C – 28°C',
    ph: '6.0 – 7.2',
    gh: '2 – 8 dGH',
    minTank: '60 Liters+',
    waterChange: '20% weekly',
    diet: 'Fine crushed flakes, cyclops, micro-granules',
    notes:
      'Schooling numbers of 10+ dramatically reduce shyness and create synchronized underwater movement.',
  },
];

const ACCLIMATION_STEPS = [
  {
    step: '01. Dim Canopy Lighting',
    detail: 'Switch off overhead LED fixtures to keep newly arrived fish calm during temperature adjustment.',
  },
  {
    step: '02. Float Sealed Bag (20 Min)',
    detail: 'Allow the transport bag to float undisturbed so water temperatures equalize gradually.',
  },
  {
    step: '03. Slow Drip Equalization (40 Min)',
    detail: 'Siphon aquarium water at 2–3 drops per second until transport volume doubles cleanly.',
  },
  {
    step: '04. Gentle Net Transfer',
    detail: 'Net the fish directly into the aquarium without pouring transport bag water into your tank.',
  },
];

export function FishCarePage() {
  const [activeId, setActiveId] = useState(CARE_GUIDES[0].id);
  const { navigate } = useRouter();
  const activeGuide = CARE_GUIDES.find((g) => g.id === activeId) ?? CARE_GUIDES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-16">
      <Reveal className="max-w-3xl space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
          Husbandry &amp; Water Chemistry
        </p>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white">
          Fish Care &amp; Acclimation Guide
        </h1>
        <p className="text-slate-300/85 text-base leading-relaxed">
          Precision water stability is the quiet secret behind vivid scales, calm behavior, and multi-year longevity.
        </p>
      </Reveal>

      {/* Interactive Species Parameter Explorer */}
      <Reveal delay={0.05}>
        <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold text-white">
              Species Parameter Reference
            </h2>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select species care guide">
              {CARE_GUIDES.map((guide) => {
                const active = activeGuide.id === guide.id;
                return (
                  <button
                    key={guide.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveId(guide.id)}
                    className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer btn-tactile ${
                      active
                        ? 'text-[#040B16]'
                        : 'bg-[#040B16]/60 text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="care-guide-tab"
                        className="absolute inset-0 rounded-lg bg-cyan-400"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{guide.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeGuide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-4 space-y-1">
                  <span className="text-xs text-slate-400 block">Temperature</span>
                  <span className="font-mono text-base font-medium text-cyan-200 tabular-nums">
                    {activeGuide.temp}
                  </span>
                </div>
                <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-4 space-y-1">
                  <span className="text-xs text-slate-400 block">Target pH</span>
                  <span className="font-mono text-base font-medium text-white tabular-nums">
                    {activeGuide.ph}
                  </span>
                </div>
                <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-4 space-y-1">
                  <span className="text-xs text-slate-400 block">Hardness</span>
                  <span className="font-mono text-base font-medium text-white tabular-nums">
                    {activeGuide.gh}
                  </span>
                </div>
                <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-4 space-y-1">
                  <span className="text-xs text-slate-400 block">Min. Tank</span>
                  <span className="font-mono text-base font-medium text-white tabular-nums">
                    {activeGuide.minTank}
                  </span>
                </div>
                <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-4 space-y-1 col-span-2">
                  <span className="text-xs text-slate-400 block">Water Change Cadence</span>
                  <span className="font-mono text-base font-medium text-amber-200 tabular-nums">
                    {activeGuide.waterChange}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1.5 font-sans">Recommended Nutrition</h3>
                  <p className="text-sm text-slate-300/90 leading-relaxed">{activeGuide.diet}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1.5 font-sans">Aquarist Notes</h3>
                  <p className="text-sm text-slate-300/90 leading-relaxed">{activeGuide.notes}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </Reveal>

      {/* Acclimation Steps */}
      <section className="space-y-8">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300/85">
                Arrival Protocol
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
                Four-Step Safe Acclimation
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/fish')}
              className="text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
            >
              Browse Quarantine-Ready Fish →
            </button>
          </div>
        </Reveal>

        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ACCLIMATION_STEPS.map((item) => (
            <StaggerItem key={item.step}>
              <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-3 h-full">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Droplets className="w-4 h-4" />
                  <span className="text-sm font-semibold text-white">{item.step}</span>
                </div>
                <p className="text-sm text-slate-300/85 leading-relaxed">{item.detail}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* Essential Tools Callout */}
      <Reveal variant="scale-in">
        <section className="glass-panel rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
              <Thermometer className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-semibold text-white">
                Need Custom Water Parameter Advice?
              </h2>
              <p className="text-sm text-slate-300/85">
                Share your tap water TDS or tank dimensions with our specialists for tailored stocking compatibility.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/contact')}
            className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Contact Aquarist Team
          </motion.button>
        </section>
      </Reveal>
    </div>
  );
}
