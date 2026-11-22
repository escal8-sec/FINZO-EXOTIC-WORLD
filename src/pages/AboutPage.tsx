import { ArrowRight, Compass, Droplets, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ASSETS } from '../data/catalog';
import { useRouter } from '../context/RouterContext';
import { ResilientImage } from '../components/ResilientImage';
import { Reveal, StaggerGrid, StaggerItem } from '../components/Reveal';
import { TiltCard } from '../components/TiltCard';

export function AboutPage() {
  const { navigate } = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-20">
      {/* Intro Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <Reveal variant="slide-right" className="lg:col-span-6 space-y-5">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300/90">
            Our Heritage &amp; Philosophy
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white leading-tight">
            Where Marine Biology Meets Architectural Craft
          </h1>
          <p className="text-slate-300/90 text-base leading-relaxed">
            FINZO EXOTIC WORLD was founded on a quiet conviction: a living aquarium should feel like a calm piece of underwater architecture, never an afterthought. Every specimen we curate and every rimless vessel we build is guided by biological patience and aesthetic restraint.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/fish')}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              Explore Exotic Fish
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl border border-white/15 hover:border-cyan-400/40 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Book Consultation
            </motion.button>
          </div>
        </Reveal>

        <Reveal variant="slide-left" delay={0.08} className="lg:col-span-6">
          <TiltCard maxTilt={4} glareOpacity={0.12} className="rounded-3xl">
            <div className="glass-panel rounded-3xl overflow-hidden group">
              <ResilientImage
                src={ASSETS.galleryRoom}
                alt="FINZO EXOTIC WORLD custom panoramic aquarium installation"
                aspectClassName="aspect-[4/3]"
                className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
          </TiltCard>
        </Reveal>
      </section>

      {/* Three Pillars */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <StaggerItem>
          <TiltCard maxTilt={3.5} glareOpacity={0.09} className="rounded-2xl">
            <div className="glass-panel glass-panel-hover rounded-2xl p-7 space-y-3 h-full">
              <ShieldCheck className="w-6 h-6 text-cyan-300" strokeWidth={1.6} />
              <h2 className="text-2xl font-semibold text-white">14-Day Quarantine</h2>
              <p className="text-sm text-slate-300/85 leading-relaxed">
                All exotic imports and tank-bred specimens undergo two full weeks of isolated monitoring, parasite screening, and prepared-food weaning before entering our showcase.
              </p>
            </div>
          </TiltCard>
        </StaggerItem>

        <StaggerItem>
          <TiltCard maxTilt={3.5} glareOpacity={0.09} className="rounded-2xl">
            <div className="glass-panel glass-panel-hover rounded-2xl p-7 space-y-3 h-full">
              <Compass className="w-6 h-6 text-amber-300" strokeWidth={1.6} />
              <h2 className="text-2xl font-semibold text-white">Ethical Lineage</h2>
              <p className="text-sm text-slate-300/85 leading-relaxed">
                We partner directly with boutique breeders across Germany, Thailand, and sustainable South American cooperatives to ensure healthy, resilient genetic lines.
              </p>
            </div>
          </TiltCard>
        </StaggerItem>

        <StaggerItem>
          <TiltCard maxTilt={3.5} glareOpacity={0.09} className="rounded-2xl">
            <div className="glass-panel glass-panel-hover rounded-2xl p-7 space-y-3 h-full">
              <Droplets className="w-6 h-6 text-cyan-300" strokeWidth={1.6} />
              <h2 className="text-2xl font-semibold text-white">Bespoke Installations</h2>
              <p className="text-sm text-slate-300/85 leading-relaxed">
                From desktop nano sanctuaries to panoramic built-in architectural reefs, our team guides lighting spectra, filtration sizing, and long-term aquascape stability.
              </p>
            </div>
          </TiltCard>
        </StaggerItem>
      </StaggerGrid>
    </div>
  );
}
