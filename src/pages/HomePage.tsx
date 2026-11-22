import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Droplets,
  Instagram,
  Layers,
  MessageCircle,
  Plus,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { ASSETS, GALLERY_INSTALLATIONS } from '../data/catalog';
import { useRouter } from '../context/RouterContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { formatINR, getEffectiveProductPrice } from '../lib/currency';
import { buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { UnderwaterScene } from '../components/UnderwaterScene';
import { ResilientImage } from '../components/ResilientImage';
import { Reveal } from '../components/Reveal';
import { TiltCard } from '../components/TiltCard';
import { CatalogSkeletonGrid } from '../components/SkeletonLoaders';
import { Product } from '../types';

const HOME_CARE_MODES = [
  {
    id: 'discus',
    label: 'Discus',
    temp: '28°C – 30°C',
    ph: '6.0 – 6.8',
    volume: '220L+',
    cadence: '30% Twice Weekly',
    tip: 'Warm, soft remineralized water with gentle lily-pipe surface flow.',
  },
  {
    id: 'betta',
    label: 'Show Betta',
    temp: '25°C – 28°C',
    ph: '6.5 – 7.4',
    volume: '20L+',
    cadence: '25% Weekly',
    tip: 'Low-current filtration and floating botanical leaves keep halfmoon fins pristine.',
  },
  {
    id: 'altum',
    label: 'Altum Angel',
    temp: '26°C – 29°C',
    ph: '5.8 – 6.8',
    volume: '250L Tall',
    cadence: '30% Weekly',
    tip: 'Minimum 60 cm tank height and vertical driftwood shelter mirror Orinoco blackwater.',
  },
];

export function HomePage() {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const { products, inventoryMap, storeSettings, isUsingDemoFallback, catalogLoading } = useCatalog();
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [enableParallax, setEnableParallax] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setEnableParallax(mq.matches && !prefersReduced);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [prefersReduced]);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const backdropY = useTransform(scrollYProgress, [0, 1], enableParallax ? [0, 54] : [0, 0]);
  const raysY = useTransform(scrollYProgress, [0, 1], enableParallax ? [0, -32] : [0, 0]);
  const plantsY = useTransform(scrollYProgress, [0, 1], enableParallax ? [0, 22] : [0, 0]);
  const spotlightY = useTransform(scrollYProgress, [0, 1], enableParallax ? [0, -18] : [0, 0]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [spotlightTab, setSpotlightTab] = useState<'best-sellers' | 'new-arrivals'>('best-sellers');
  const [selectedTankVariantIdx, setSelectedTankVariantIdx] = useState(1);
  const [careModeId, setCareModeId] = useState('discus');
  const [addedId, setAddedId] = useState<string | null>(null);

  const visibleProducts = products.filter((p) => p.isAvailable !== false);
  const fishProducts = visibleProducts.filter((p) => p.kind === 'fish');
  const aquariumProducts = visibleProducts.filter((p) => p.kind === 'aquarium');

  const heroSpecimens = fishProducts.slice(0, 4);
  const heroSpecimen =
    heroSpecimens[heroIndex % Math.max(1, heroSpecimens.length)] ?? visibleProducts[0];

  const leadFish = fishProducts[0] ?? visibleProducts[0];
  const secondaryFish = fishProducts.slice(1, 3);

  const bestSellers = visibleProducts.filter((p) => p.badge === 'Best Seller').slice(0, 3);
  const newArrivals = visibleProducts
    .filter((p) => p.badge === 'New Arrival' || p.badge === 'Collector Grade')
    .slice(0, 3);
  const activeSpotlight =
    spotlightTab === 'best-sellers'
      ? bestSellers.length > 0
        ? bestSellers
        : visibleProducts.slice(0, 3)
      : newArrivals.length > 0
      ? newArrivals
      : visibleProducts.slice(0, 3);

  const flagshipTank =
    aquariumProducts.find((p) => p.id === 'aq-opticlear-120p') ??
    aquariumProducts[0] ??
    visibleProducts[0];
  const activeTankVariant =
    flagshipTank?.variants[selectedTankVariantIdx] ?? flagshipTank?.variants[0];
  const secondaryHardware = aquariumProducts
    .filter((p) => p.id !== flagshipTank?.id)
    .slice(0, 2);

  const activeCare = HOME_CARE_MODES.find((c) => c.id === careModeId) ?? HOME_CARE_MODES[0];
  const activeBanners = storeSettings.banners.filter((b) => b.isActive);
  const igSlug = storeSettings.instagramHandle.replace(/^@/, '') || 'finzo.exotic_world';
  const waHref = buildWhatsAppDirectUrl(
    storeSettings.whatsappNumber,
    `Hello ${storeSettings.storeName}, I would like to inquire about your exotic fish & custom aquariums.`
  );

  const triggerQuickAdd = (product: Product, variant = product.variants?.[0]) => {
    const inv = inventoryMap[product.id];
    const isOut =
      product.isAvailable === false ||
      (inv ? inv.stockCount <= 0 : product.availability === 'Out of Stock');
    if (isOut) return;
    const resolvedVariant = variant ?? {
      id: `${product.id}-std`,
      label: product.kind === 'fish' ? 'Standard Specimen' : 'Standard Configuration',
      price: product.price,
    };
    addItem(product, resolvedVariant, 1);
    setAddedId(`${product.id}-${resolvedVariant.id}`);
    window.setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div>
      {/* 1. Asymmetric Cinematic Underwater Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden border-b border-white/10"
      >
        <UnderwaterScene backdropY={backdropY} raysY={raysY} plantsY={plantsY} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left: Editorial Display Typography */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-6"
            >
              <p className="text-xs sm:text-sm font-medium tracking-[0.22em] text-amber-200/90 uppercase">
                {storeSettings.storeName} · {storeSettings.tagline}
              </p>

              <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.35rem] font-semibold text-white tracking-tight leading-[1.03]">
                {storeSettings.heroHeadline}
              </h1>

              <p className="text-base sm:text-xl text-slate-200/90 leading-relaxed max-w-xl">
                {storeSettings.heroSubtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => navigate('/fish')}
                  className="px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm inline-flex items-center gap-2 transition-colors duration-200 shadow-lg shadow-cyan-500/20 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Explore Fish
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => navigate('/aquariums')}
                  className="px-6 py-3.5 rounded-xl bg-[#07162B]/80 hover:bg-[#0D2342] text-white border border-white/20 hover:border-cyan-300/45 backdrop-blur-md font-semibold text-sm inline-flex items-center gap-2 transition-colors duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Shop Now
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => navigate('/custom-aquarium')}
                  className="px-6 py-3.5 rounded-xl bg-amber-300/15 hover:bg-amber-300/25 text-amber-200 border border-amber-300/40 backdrop-blur-md font-semibold text-sm inline-flex items-center gap-2 transition-colors duration-200 whitespace-nowrap cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  Build Custom Aquarium
                </motion.button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300/85">
                <span>14-Day Quarantine Protocol</span>
                <span aria-hidden="true" className="text-amber-300/60">·</span>
                <span>OptiClear Low-Iron Vessels</span>
                <span aria-hidden="true" className="text-amber-300/60">·</span>
                <span>{isUsingDemoFallback ? 'Demo Catalog Active' : 'Live Storefront Catalog'}</span>
              </div>
            </motion.div>

            {/* Hero Right: Interactive Realistic Specimen Spotlight */}
            {heroSpecimen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ y: spotlightY }}
                transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 will-change-transform"
              >
                <TiltCard maxTilt={4} glareOpacity={0.12} className="rounded-3xl">
                  <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/50">
                  <div className="relative rounded-2xl overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={heroSpecimen.id}
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.32 }}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${heroSpecimen.slug}`)}
                          className="block w-full text-left relative group cursor-pointer"
                          aria-label={`Inspect ${heroSpecimen.name}`}
                        >
                          <ResilientImage
                            src={heroSpecimen.image}
                            alt={heroSpecimen.name}
                            aspectClassName="aspect-[4/3]"
                            className="transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-[#040B16]/90 via-[#040B16]/20 to-transparent"
                            aria-hidden="true"
                          />
                          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/90">
                                {heroSpecimen.category} · {heroSpecimen.availability}
                              </p>
                              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
                                {heroSpecimen.name}
                              </h2>
                              <p className="font-mono text-xs text-cyan-200/85 tabular-nums mt-0.5">
                                {formatINR(getEffectiveProductPrice(heroSpecimen).currentPrice)} · {heroSpecimen.highlightSpec}
                              </p>
                            </div>
                            <span className="p-2.5 rounded-full bg-white/10 border border-white/20 text-white group-hover:bg-cyan-400 group-hover:text-[#040B16] transition-colors shrink-0">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </div>
                        </button>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Realistic Specimen Thumbnail Switcher */}
                  <div className="mt-4 grid grid-cols-4 gap-2.5">
                    {heroSpecimens.map((item, idx) => {
                      const active = idx === heroIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setHeroIndex(idx)}
                          className={`rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            active
                              ? 'border-cyan-400 ring-2 ring-cyan-400/25 opacity-100'
                              : 'border-white/10 opacity-60 hover:opacity-95'
                          }`}
                          aria-label={`Preview ${item.name}`}
                        >
                          <ResilientImage
                            src={item.image}
                            alt={item.name}
                            aspectClassName="aspect-[4/3]"
                          />
                        </button>
                      );
                    })}
                  </div>
                  </div>
                </TiltCard>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Promotional / Studio Banner Strip */}
      {activeBanners.length > 0 && (
        <section className="bg-[#061529] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                {activeBanners[0].title}
              </p>
              <p className="text-sm text-slate-300">{activeBanners[0].subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(activeBanners[0].ctaPath || '/custom-aquarium')}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              {activeBanners[0].ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* 2. Featured Fish Collections — Asymmetric 12-Col Editorial Bento */}
      <section className="py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="space-y-2.5 max-w-2xl">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300/90">
                Featured Fish Collections
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white">
                Living Jewels of Rare Lineage
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/fish')}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              View All {fishProducts.length} Species
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Reveal>

        {catalogLoading && visibleProducts.length === 0 ? (
          <CatalogSkeletonGrid count={3} />
        ) : leadFish ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left 6 Cols: Lead Specimen Feature */}
            <Reveal className="lg:col-span-6 flex">
              <TiltCard maxTilt={3.5} glareOpacity={0.1} className="w-full rounded-3xl">
                <article className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col w-full h-full">
                <button
                  type="button"
                  onClick={() => navigate(`/product/${leadFish.slug}`)}
                  className="relative block text-left w-full cursor-pointer group"
                >
                  <ResilientImage
                    src={leadFish.image}
                    alt={leadFish.name}
                    aspectClassName="aspect-[4/3]"
                    className="transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#040B16]/85 via-transparent to-transparent"
                    aria-hidden="true"
                  />
                  <span className="absolute top-4 left-4 text-[11px] font-medium tracking-wider uppercase text-amber-200 bg-[#040B16]/75 backdrop-blur-md px-3 py-1 rounded-md border border-amber-300/25">
                    Signature Lineage
                  </span>
                </button>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{leadFish.originOrMaterial}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-300">{leadFish.availability}</span>
                    </div>
                    <h3 className="font-display text-3xl sm:text-4xl font-semibold text-white">
                      {leadFish.name}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed">
                      {leadFish.description}
                    </p>
                    <p className="font-mono text-xs text-cyan-200/85 tabular-nums pt-1">
                      {leadFish.highlightSpec}
                    </p>
                  </div>

                  {(() => {
                    const pricing = getEffectiveProductPrice(leadFish);
                    return (
                      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs text-slate-400 block">Starting at</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-2xl font-semibold text-white tabular-nums">
                              {formatINR(pricing.currentPrice)}
                            </span>
                            {pricing.hasDiscount && pricing.originalPrice && (
                              <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                                {formatINR(pricing.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => triggerQuickAdd(leadFish)}
                            className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {addedId === `${leadFish.id}-${leadFish.variants?.[0]?.id ?? `${leadFish.id}-std`}` ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Add to Cart
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/product/${leadFish.slug}`)}
                            className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/35 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </article>
              </TiltCard>
            </Reveal>

            {/* Right 6 Cols: Stacked Horizontal Editorial Cards */}
            <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8">
              {secondaryFish.map((item, i) => {
                const pricing = getEffectiveProductPrice(item);
                return (
                  <Reveal key={item.id} delay={0.08 * (i + 1)} className="flex-1 flex">
                    <article className="glass-panel glass-panel-hover rounded-3xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 w-full">
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${item.slug}`)}
                        className="sm:col-span-5 relative block w-full h-full overflow-hidden cursor-pointer group min-h-[200px]"
                      >
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          aspectClassName="aspect-[4/3] sm:aspect-auto sm:h-full w-full"
                          className="sm:h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </button>

                      <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.availability}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/product/${item.slug}`)}
                            className="text-left block group cursor-pointer"
                          >
                            <h3 className="font-display text-2xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {item.name}
                            </h3>
                          </button>
                          <p className="text-xs italic font-display text-amber-200/80 text-sm">
                            {item.scientificName}
                          </p>
                          <p className="text-sm text-slate-300/85 line-clamp-2 pt-1">
                            {item.shortDescription}
                          </p>
                          <p className="font-mono text-[11px] text-cyan-200/80 tabular-nums pt-1">
                            {item.highlightSpec}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-lg font-semibold text-white tabular-nums">
                              {formatINR(pricing.currentPrice)}
                            </span>
                            {pricing.hasDiscount && pricing.originalPrice && (
                              <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                                {formatINR(pricing.originalPrice)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => triggerQuickAdd(item)}
                              className="px-3.5 py-2 rounded-lg bg-cyan-400/15 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border border-cyan-400/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {addedId === `${item.id}-${item.variants?.[0]?.id ?? `${item.id}-std`}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Add
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/product/${item.slug}`)}
                              className="p-2 rounded-lg border border-white/15 hover:border-white/35 text-slate-200 hover:text-white transition-colors cursor-pointer"
                              aria-label={`Inspect ${item.name}`}
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <div className="gold-hairline h-px max-w-7xl mx-auto opacity-45" aria-hidden="true" />

      {/* 3. Best Sellers & New Arrivals — Exhibition Split */}
      <section className="py-20 lg:py-24 bg-[#061224]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2.5">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300/85">
                  Seasonal Exhibition
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white">
                  {spotlightTab === 'best-sellers' ? 'Collector Best Sellers' : 'Latest New Arrivals'}
                </h2>
              </div>

              <div
                className="inline-flex p-1 rounded-xl bg-[#040B16] border border-white/10 self-start md:self-auto"
                role="tablist"
                aria-label="Product spotlight filter"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={spotlightTab === 'best-sellers'}
                  onClick={() => setSpotlightTab('best-sellers')}
                  className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    spotlightTab === 'best-sellers'
                      ? 'text-[#040B16]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spotlightTab === 'best-sellers' && (
                    <motion.span
                      layoutId="home-spotlight-tab"
                      className="absolute inset-0 rounded-lg bg-cyan-400"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">Best Sellers</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={spotlightTab === 'new-arrivals'}
                  onClick={() => setSpotlightTab('new-arrivals')}
                  className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    spotlightTab === 'new-arrivals'
                      ? 'text-[#040B16]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spotlightTab === 'new-arrivals' && (
                    <motion.span
                      layoutId="home-spotlight-tab"
                      className="absolute inset-0 rounded-lg bg-cyan-400"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">New Arrivals</span>
                </button>
              </div>
            </div>
          </Reveal>

          <AnimatePresence mode="wait">
            <motion.div
              key={spotlightTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
            >
              {activeSpotlight.map((item) => {
                const pricing = getEffectiveProductPrice(item);
                return (
                  <TiltCard key={item.id} maxTilt={4} glareOpacity={0.1} className="rounded-2xl">
                    <article
                      className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col justify-between h-full"
                    >
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${item.slug}`)}
                        className="relative block w-full text-left cursor-pointer group"
                      >
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          aspectClassName="aspect-[4/3]"
                          className="transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-[#040B16]/85 via-transparent to-transparent"
                          aria-hidden="true"
                        />
                        {item.badge && (
                          <span className="absolute top-3.5 left-3.5 text-[11px] font-medium tracking-wider uppercase text-amber-200 bg-[#040B16]/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-300/25">
                            {item.badge}
                          </span>
                        )}
                      </button>

                      <div className="p-6 space-y-2">
                        <p className="text-xs text-slate-400">
                          {item.category} · {item.originOrMaterial}
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${item.slug}`)}
                          className="text-left block group cursor-pointer"
                        >
                          <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {item.name}
                          </h3>
                        </button>
                        <p className="text-sm text-slate-300/85 line-clamp-2">
                          {item.shortDescription}
                        </p>
                        <p className="font-mono text-[11px] text-cyan-200/80 tabular-nums pt-1">
                          {item.highlightSpec}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-lg font-semibold text-white tabular-nums">
                          {formatINR(pricing.currentPrice)}
                        </span>
                        {pricing.hasDiscount && pricing.originalPrice && (
                          <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                            {formatINR(pricing.originalPrice)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerQuickAdd(item)}
                        className="px-3.5 py-2 rounded-lg bg-cyan-400/15 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border border-cyan-400/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {addedId === `${item.id}-${item.variants?.[0]?.id ?? `${item.id}-std`}` ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                    </article>
                  </TiltCard>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* 4. Architectural Aquarium Showcase + Custom 3D Studio Callout */}
      {flagshipTank && activeTankVariant && (
        <section className="py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <Reveal>
            <div className="glass-panel rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[340px]">
                <ResilientImage
                  src={flagshipTank.image}
                  alt={flagshipTank.name}
                  aspectClassName="aspect-[4/3] lg:aspect-auto lg:h-full w-full"
                  className="lg:h-full object-cover"
                />
              </div>

              <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
                    Architectural Aquariums
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white leading-tight">
                    {flagshipTank.name}
                  </h2>
                  <p className="text-sm text-slate-300/90 leading-relaxed">
                    {flagshipTank.shortDescription}
                  </p>

                  {/* Interactive Size Selector */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-medium text-slate-400 block">
                      Select Vessel Footprint
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {flagshipTank.variants.map((variant, idx) => {
                        const shortLabel = variant.label.split(' ')[0];
                        const active = idx === selectedTankVariantIdx;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedTankVariantIdx(idx)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? 'bg-cyan-400 text-[#040B16] border-cyan-300'
                                : 'bg-[#040B16]/60 text-slate-300 border-white/10 hover:border-white/30'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                    <p className="font-mono text-xs text-cyan-200/85 tabular-nums pt-1">
                      {activeTankVariant.label}
                    </p>
                  </div>
                </div>

                {(() => {
                  const tankPrice = getEffectiveProductPrice(flagshipTank, activeTankVariant);
                  return (
                    <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block">Configured System</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-2xl font-semibold text-white tabular-nums">
                            {formatINR(tankPrice.currentPrice)}
                          </span>
                          {tankPrice.hasDiscount && tankPrice.originalPrice && (
                            <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                              {formatINR(tankPrice.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => triggerQuickAdd(flagshipTank, activeTankVariant)}
                          className="px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add System
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/custom-aquarium')}
                          className="px-4 py-3 rounded-xl border border-amber-300/40 bg-amber-300/10 hover:bg-amber-300/20 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Customize in 3D
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </Reveal>

          {secondaryHardware.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {secondaryHardware.map((hw, idx) => {
                const hwPrice = getEffectiveProductPrice(hw);
                return (
                  <Reveal key={hw.id} delay={0.08 * (idx + 1)}>
                    <article className="glass-panel glass-panel-hover rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 h-full">
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${hw.slug}`)}
                        className="sm:col-span-5 relative block w-full h-full overflow-hidden cursor-pointer group min-h-[190px]"
                      >
                        <ResilientImage
                          src={hw.image}
                          alt={hw.name}
                          aspectClassName="aspect-[4/3] sm:aspect-auto sm:h-full w-full"
                          className="sm:h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </button>
                      <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                          <span className="text-xs text-slate-400">
                            {hw.category} · {hw.originOrMaterial}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/product/${hw.slug}`)}
                            className="text-left block group cursor-pointer"
                          >
                            <h3 className="font-display text-2xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {hw.name}
                            </h3>
                          </button>
                          <p className="text-sm text-slate-300/85 line-clamp-2">
                            {hw.shortDescription}
                          </p>
                          <p className="font-mono text-[11px] text-cyan-200/80 tabular-nums pt-0.5">
                            {hw.highlightSpec}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-lg font-semibold text-white tabular-nums">
                              {formatINR(hwPrice.currentPrice)}
                            </span>
                            {hwPrice.hasDiscount && hwPrice.originalPrice && (
                              <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                                {formatINR(hwPrice.originalPrice)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerQuickAdd(hw)}
                            className="px-4 py-2 rounded-lg bg-cyan-400/15 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border border-cyan-400/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. Fish Care Section — Interactive Water Mastery Console */}
      <section className="py-20 lg:py-24 bg-[#071529]/85 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-5 space-y-5">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300/85">
                  Biological Stewardship
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white leading-tight">
                  Guided Fish Care &amp; Water Mastery
                </h2>
                <p className="text-slate-300/85 text-base leading-relaxed">
                  Preview ideal freshwater biotope parameters before introducing new specimens. Our 14-day quarantine and 45-minute drip acclimation protocol keeps sensitive species thriving.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/care')}
                  className="px-6 py-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 hover:bg-cyan-400 hover:text-[#040B16] text-cyan-200 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  Open Complete Care Guide
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Droplets className="w-5 h-5 text-cyan-300" />
                    <span className="text-sm font-semibold text-white">
                      Target Biotope Console
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select fish care preset">
                    {HOME_CARE_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        role="tab"
                        aria-selected={careModeId === mode.id}
                        onClick={() => setCareModeId(mode.id)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          careModeId === mode.id
                            ? 'text-[#040B16]'
                            : 'bg-[#040B16]/70 text-slate-300 hover:text-white border border-white/10'
                        }`}
                      >
                        {careModeId === mode.id && (
                          <motion.span
                            layoutId="home-care-tab"
                            className="absolute inset-0 rounded-lg bg-cyan-400"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="rounded-xl bg-[#040B16]/65 border border-white/10 p-4">
                    <span className="text-[11px] text-slate-400 block">Temperature</span>
                    <span className="font-mono text-sm sm:text-base font-medium text-cyan-200 tabular-nums mt-1 block">
                      {activeCare.temp}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#040B16]/65 border border-white/10 p-4">
                    <span className="text-[11px] text-slate-400 block">Target pH</span>
                    <span className="font-mono text-sm sm:text-base font-medium text-white tabular-nums mt-1 block">
                      {activeCare.ph}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#040B16]/65 border border-white/10 p-4">
                    <span className="text-[11px] text-slate-400 block">Min. Tank</span>
                    <span className="font-mono text-sm sm:text-base font-medium text-white tabular-nums mt-1 block">
                      {activeCare.volume}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#040B16]/65 border border-white/10 p-4">
                    <span className="text-[11px] text-slate-400 block">Water Refresh</span>
                    <span className="font-mono text-sm sm:text-base font-medium text-amber-200 tabular-nums mt-1 block">
                      {activeCare.cadence}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-300/90 leading-relaxed pt-1">
                  {activeCare.tip}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. Customer Gallery — Staggered Editorial Mosaic */}
      <section className="py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="space-y-2.5 max-w-2xl">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300/90">
                Customer Gallery
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white">
                Living Sanctuary Installations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/custom-aquarium')}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Design Yours in 3D
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {GALLERY_INSTALLATIONS.map((item, idx) => {
            const colSpan =
              idx === 0 || idx === 3 ? 'lg:col-span-7' : 'lg:col-span-5';
            return (
              <Reveal key={item.id} delay={0.05 * idx} className={colSpan}>
                <figure className="glass-panel rounded-3xl overflow-hidden flex flex-col h-full">
                  <ResilientImage
                    src={item.image}
                    alt={item.title}
                    aspectClassName={idx === 0 || idx === 3 ? 'aspect-[16/10]' : 'aspect-[4/3]'}
                  />
                  <figcaption className="p-6 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{item.collector}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-cyan-300/90">{item.tankSpec}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-slate-300/85 leading-relaxed">{item.caption}</p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 7. Instagram & WhatsApp Concierge Section */}
      <section className="pb-20 lg:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-25"
              style={{
                background: 'radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300/90">
                  Direct Aquarist Access
                </p>
                <h2 className="font-display text-3xl sm:text-5xl font-semibold text-white leading-tight">
                  Follow {storeSettings.instagramHandle} or Speak With a Specialist
                </h2>
                <p className="text-slate-300/90 text-base leading-relaxed max-w-2xl">
                  View weekly specimen reels and aquascape builds on Instagram, or message our team directly on WhatsApp ({storeSettings.whatsappNumber}) for custom tank planning and species pairing advice.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href={`https://instagram.com/${igSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap"
                  >
                    <Instagram className="w-4 h-4 text-amber-300" />
                    {storeSettings.instagramHandle}
                  </a>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Concierge
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                {[ASSETS.discus, ASSETS.betta, ASSETS.cardinalTetras, ASSETS.galleryAquascape].map(
                  (img, i) => (
                    <a
                      key={img}
                      href={`https://instagram.com/${igSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400/45 transition-all group block"
                      aria-label={`View ${storeSettings.storeName} gallery post ${i + 1}`}
                    >
                      <ResilientImage
                        src={img}
                        alt={`${storeSettings.storeName} showcase ${i + 1}`}
                        aspectClassName="aspect-[4/3]"
                        className="transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
