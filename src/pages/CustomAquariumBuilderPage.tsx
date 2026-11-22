import { useMemo, useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Aquarium3DPreview } from '../components/Aquarium3DPreview';
import { ResilientImage } from '../components/ResilientImage';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import { formatINR, getEffectiveProductPrice } from '../lib/currency';
import { calculateCustomAquariumPricing } from '../lib/customAquariumPricing';
import {
  BackingColor,
  CustomAddonRole,
  CustomAquariumAddonItem,
  CustomAquariumSpec,
  FiltrationPreset,
  GlassFinish,
  LightingPreset,
  LivestockStarter,
  PlantsLevel,
  PlumbingKit,
  Product,
  RockHardscape,
  StandMaterial,
  SubstrateOption,
  TankShape,
} from '../types';

const DIMENSION_PRESETS = [
  { label: '60P Nano (60×35×36)', l: 60, w: 35, h: 36, t: 8 },
  { label: '90P Gallery (90×45×45)', l: 90, w: 45, h: 45, t: 10 },
  { label: '120P Flagship (120×50×50)', l: 120, w: 50, h: 50, t: 12 },
  { label: '150P Architectural (150×60×55)', l: 150, w: 60, h: 55, t: 15 },
];

const GLASS_THICKNESS_OPTIONS = [6, 8, 10, 12, 15, 19];
const SHAPE_OPTIONS: TankShape[] = [
  'Standard Rimless',
  'Cube',
  'Peninsula',
  'Bowfront',
  'Tall Architectural',
];
const FINISH_OPTIONS: GlassFinish[] = [
  'OptiClear Low-Iron',
  'Ultra-Clear Black Silicone',
  'Tinted Obsidian Back',
];
const BACKING_OPTIONS: BackingColor[] = [
  'Clear Panorama',
  'Deep Ocean Navy',
  'Obsidian Black',
  'Frosted Mist',
];
const STAND_OPTIONS: StandMaterial[] = [
  'None (Tank Only)',
  'Matte Obsidian Cabinet',
  'Burmese Teak Hardwood',
  'Brushed Anodized Steel',
];
const LIGHTING_OPTIONS: LightingPreset[] = [
  'None',
  'RGBW Full-Spectrum Pendant',
  'Marine Reef Actinics',
  'Warm Botanical Spot',
];
const FILTRATION_OPTIONS: FiltrationPreset[] = [
  'None',
  'Internal Whisper Bio',
  'External Canister + 316L Lily Pipes',
  'Concealed Rear Sump',
];
const SUBSTRATE_OPTIONS: SubstrateOption[] = [
  'None',
  'Japanese Aquasoil',
  'Silica River Sand',
  'Volcanic Dark Gravel',
];
const PLANTS_OPTIONS: PlantsLevel[] = [
  'None',
  'Minimalist Anubias & Moss',
  'Lush Nature Aquascape',
];
const HARDSCAPE_OPTIONS: RockHardscape[] = [
  'None',
  'Seiryu Mountain Stone',
  'Ohko Dragon Stone',
  'Malaysian Driftwood',
];
const LIVESTOCK_OPTIONS: LivestockStarter[] = [
  'None',
  'Cardinal Tetra Shoal (12)',
  'Galaxy Koi Betta Feature',
  'Royal Turquoise Discus Pair',
];
const PLUMBING_OPTIONS: PlumbingKit[] = [
  'Standard Glass Lid & Leveling Mat',
  'Pro CO2 Diffuser + Heater + Lid Kit',
];

export function CustomAquariumBuilderPage() {
  const { products, storeSettings } = useCatalog();
  const { addCustomAquarium } = useCart();
  const { navigate } = useRouter();

  const [buildName, setBuildName] = useState('Signature Sanctuary 120P');
  const [lengthCm, setLengthCm] = useState(120);
  const [widthCm, setWidthCm] = useState(50);
  const [heightCm, setHeightCm] = useState(50);
  const [glassThicknessMm, setGlassThicknessMm] = useState(12);
  const [shape, setShape] = useState<TankShape>('Standard Rimless');
  const [glassFinish, setGlassFinish] = useState<GlassFinish>('OptiClear Low-Iron');
  const [backingColor, setBackingColor] = useState<BackingColor>('Deep Ocean Navy');
  const [stand, setStand] = useState<StandMaterial>('Matte Obsidian Cabinet');
  const [lighting, setLighting] = useState<LightingPreset>('RGBW Full-Spectrum Pendant');
  const [filtration, setFiltration] = useState<FiltrationPreset>(
    'External Canister + 316L Lily Pipes'
  );
  const [substrate, setSubstrate] = useState<SubstrateOption>('Japanese Aquasoil');
  const [plants, setPlants] = useState<PlantsLevel>('Minimalist Anubias & Moss');
  const [hardscape, setHardscape] = useState<RockHardscape>('Seiryu Mountain Stone');
  const [livestock, setLivestock] = useState<LivestockStarter>('Cardinal Tetra Shoal (12)');
  const [plumbingKit, setPlumbingKit] = useState<PlumbingKit>(
    'Standard Glass Lid & Leveling Mat'
  );
  const [notes, setNotes] = useState('');

  // Store-backed Compatible Add-On Products
  const [addons, setAddons] = useState<CustomAquariumAddonItem[]>([]);
  const [addonRoleFilter, setAddonRoleFilter] = useState<'all' | CustomAddonRole>('all');
  const [addonSearch, setAddonSearch] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const pricingConfig = storeSettings.customAquariumConfig;

  const breakdown = useMemo(
    () =>
      calculateCustomAquariumPricing(
        {
          lengthCm,
          widthCm,
          heightCm,
          glassThicknessMm,
          shape,
          glassFinish,
          backingColor,
          stand,
          lighting,
          filtration,
          substrate,
          plants,
          hardscape,
          livestock,
          plumbingKit,
          addons,
        },
        pricingConfig
      ),
    [
      lengthCm,
      widthCm,
      heightCm,
      glassThicknessMm,
      shape,
      glassFinish,
      backingColor,
      stand,
      lighting,
      filtration,
      substrate,
      plants,
      hardscape,
      livestock,
      plumbingKit,
      addons,
      pricingConfig,
    ]
  );

  const compatibleStoreProducts = useMemo(() => {
    const q = addonSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (p.isAvailable === false || !p.customAquariumCompatible) return false;
      const matchesRole = addonRoleFilter === 'all' || p.customAddonRole === addonRoleFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [products, addonRoleFilter, addonSearch]);

  const handleAddAddonProduct = (product: Product) => {
    const variant = product.variants[0];
    const { currentPrice } = getEffectiveProductPrice(product, variant);
    setAddons((prev) => {
      const idx = prev.findIndex((a) => a.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1, price: currentPrice };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          variantLabel: variant.label,
          name: product.name,
          category: product.category,
          role: product.customAddonRole,
          price: currentPrice,
          quantity: 1,
          image: product.image,
          slug: product.slug,
        },
      ];
    });
  };

  const handleUpdateAddonQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setAddons((prev) => prev.filter((a) => a.productId !== productId));
      return;
    }
    setAddons((prev) =>
      prev.map((a) => (a.productId === productId ? { ...a, quantity: qty } : a))
    );
  };

  const buildCurrentSpec = (): CustomAquariumSpec => ({
    buildName: buildName.trim() || `Custom ${lengthCm}×${widthCm}×${heightCm} cm Aquarium`,
    lengthCm,
    widthCm,
    heightCm,
    liters: breakdown.liters,
    glassThicknessMm,
    shape,
    glassFinish,
    backingColor,
    stand,
    lighting,
    filtration,
    substrate,
    plants,
    hardscape,
    livestock,
    plumbingKit,
    addons,
    breakdown,
    notes: notes.trim() || undefined,
  });

  const handleAddBuildToCart = (goToCheckout: boolean) => {
    addCustomAquarium(buildCurrentSpec());
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
    if (goToCheckout) {
      navigate('/cart');
    }
  };

  const estDelivery = storeSettings.deliveryConfig.customAquariumDeliveryCharge;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
          3D Architectural Atelier · Live INR Pricing
        </p>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white">
          Build Your Custom Aquarium
        </h1>
        <p className="text-slate-300/85 text-base leading-relaxed">
          Configure exact dimensions, glass grade, cabinetry, lighting, aquascape flora, exotic fish, and compatible FINZO store accessories with real-time 3D preview and transparent rupee pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky: Live 3D Preview + Transparent 6-Line Price Breakdown */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-6">
          <Aquarium3DPreview
            config={{
              lengthCm,
              widthCm,
              heightCm,
              liters: breakdown.liters,
              glassThicknessMm,
              shape,
              glassFinish,
              backingColor,
              stand,
              lighting,
              filtration,
              substrate,
              plants,
              hardscape,
              livestock,
              plumbingKit,
            }}
          />

          {/* Live Price Breakdown Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200">
                  Live Configuration Quote
                </p>
                <h2 className="font-display text-2xl font-semibold text-white">
                  {buildName || 'Custom Aquarium System'}
                </h2>
              </div>
              <span className="font-mono text-xs px-3 py-1 rounded-lg bg-cyan-400/15 text-cyan-200 border border-cyan-400/30 tabular-nums">
                {breakdown.liters} Liters
              </span>
            </div>

            <dl className="space-y-2 text-sm border-y border-white/10 py-4">
              <div className="flex justify-between">
                <dt className="text-slate-400">
                  Base Tank ({lengthCm}×{widthCm}×{heightCm} cm · {glassThicknessMm}mm)
                </dt>
                <dd className="font-mono text-white tabular-nums">
                  {formatINR(breakdown.baseTankPrice)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Shape, Glass Finish &amp; Backing</dt>
                <dd className="font-mono text-white tabular-nums">
                  {formatINR(breakdown.customizationCharges)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">
                  Stand, Lighting, Filtration &amp; Scape
                </dt>
                <dd className="font-mono text-white tabular-nums">
                  {formatINR(breakdown.selectedAccessoriesCost)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">
                  Added Store Products ({addons.reduce((s, a) => s + a.quantity, 0)})
                </dt>
                <dd className="font-mono text-cyan-200 tabular-nums">
                  {formatINR(breakdown.addonsTotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Crated Tank Delivery (Est.)</dt>
                <dd className="font-mono text-slate-300 tabular-nums">
                  {formatINR(estDelivery)}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <dt className="text-white font-semibold">Build Subtotal (Before Checkout)</dt>
                <dd className="font-mono text-xl font-semibold text-white tabular-nums">
                  {formatINR(breakdown.aquariumTotalBeforeDelivery)}
                </dd>
              </div>
              <div className="flex justify-between text-xs text-amber-200/90">
                <dt>Estimated Total with Crated Shipping</dt>
                <dd className="font-mono tabular-nums">
                  {formatINR(breakdown.aquariumTotalBeforeDelivery + estDelivery)}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAddBuildToCart(false)}
                className="py-3.5 px-4 rounded-xl border border-cyan-400/45 bg-cyan-400/12 hover:bg-cyan-400/20 text-cyan-100 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Add Build to Cart
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleAddBuildToCart(true)}
                className="py-3.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Specification Modules + Compatible Store Add-Ons */}
        <div className="lg:col-span-6 space-y-6">
          {/* Step 1: Dimensions & Vessel Engineering */}
          <section className="glass-panel rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold text-white">
                1. Vessel Dimensions &amp; Glass
              </h2>
              <span className="text-xs text-cyan-300">Live 3D Sync</span>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400">Project / Build Title</span>
              <input
                type="text"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {DIMENSION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setLengthCm(preset.l);
                    setWidthCm(preset.w);
                    setHeightCm(preset.h);
                    setGlassThicknessMm(preset.t);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#040B16]/80 border border-white/10 hover:border-cyan-400/50 text-xs text-slate-200 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Length</span>
                  <span className="font-mono text-cyan-200">{lengthCm} cm</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={240}
                  step={5}
                  value={lengthCm}
                  onChange={(e) => setLengthCm(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Width</span>
                  <span className="font-mono text-cyan-200">{widthCm} cm</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={widthCm}
                  onChange={(e) => setWidthCm(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="block space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Height</span>
                  <span className="font-mono text-cyan-200">{heightCm} cm</span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={90}
                  step={5}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Glass Thickness</span>
                <select
                  value={glassThicknessMm}
                  onChange={(e) => setGlassThicknessMm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {GLASS_THICKNESS_OPTIONS.map((mm) => (
                    <option key={mm} value={mm}>
                      {mm} mm Tempered Low-Iron (×{pricingConfig.glassThicknessMultipliers[String(mm)] ?? 1})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Tank Silhouette</span>
                <select
                  value={shape}
                  onChange={(e) => setShape(e.target.value as TankShape)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {SHAPE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s} ({pricingConfig.shapeFees[s] ? `+${formatINR(pricingConfig.shapeFees[s])}` : 'Included'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Glass Finish</span>
                <select
                  value={glassFinish}
                  onChange={(e) => setGlassFinish(e.target.value as GlassFinish)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {FINISH_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f} (+{formatINR(pricingConfig.finishFees[f] ?? 0)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Background Panel</span>
                <select
                  value={backingColor}
                  onChange={(e) => setBackingColor(e.target.value as BackingColor)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {BACKING_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b} ({pricingConfig.backingFees[b] ? `+${formatINR(pricingConfig.backingFees[b])}` : 'Included'})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Step 2: Cabinetry, Lighting & Filtration */}
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              2. Stand, Lighting &amp; Filtration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Architectural Stand</span>
                <select
                  value={stand}
                  onChange={(e) => setStand(e.target.value as StandMaterial)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {STAND_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.standFees[opt] ? `+${formatINR(pricingConfig.standFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">LED Lighting</span>
                <select
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value as LightingPreset)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {LIGHTING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.lightingFees[opt] ? `+${formatINR(pricingConfig.lightingFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Filtration System</span>
                <select
                  value={filtration}
                  onChange={(e) => setFiltration(e.target.value as FiltrationPreset)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {FILTRATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.filtrationFees[opt] ? `+${formatINR(pricingConfig.filtrationFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Lid, Heater &amp; Plumbing</span>
                <select
                  value={plumbingKit}
                  onChange={(e) => setPlumbingKit(e.target.value as PlumbingKit)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {PLUMBING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} (+{formatINR(pricingConfig.plumbingFees[opt] ?? 0)})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Step 3: Aquascape, Flora & Starter Livestock */}
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              3. Aquascape, Flora &amp; Exotic Livestock
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Substrate Bed</span>
                <select
                  value={substrate}
                  onChange={(e) => setSubstrate(e.target.value as SubstrateOption)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {SUBSTRATE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.substrateFees[opt] ? `+${formatINR(pricingConfig.substrateFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Hardscape Material</span>
                <select
                  value={hardscape}
                  onChange={(e) => setHardscape(e.target.value as RockHardscape)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {HARDSCAPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.hardscapeFees[opt] ? `+${formatINR(pricingConfig.hardscapeFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Aquatic Plants</span>
                <select
                  value={plants}
                  onChange={(e) => setPlants(e.target.value as PlantsLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {PLANTS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.plantsFees[opt] ? `+${formatINR(pricingConfig.plantsFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Starter Exotic Livestock</span>
                <select
                  value={livestock}
                  onChange={(e) => setLivestock(e.target.value as LivestockStarter)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white cursor-pointer"
                >
                  {LIVESTOCK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} ({pricingConfig.livestockFees[opt] ? `+${formatINR(pricingConfig.livestockFees[opt])}` : '₹0'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400">Custom Fabrication Notes (optional)</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pre-drill dual 25mm overflow bulkheads on right side..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
            </label>
          </section>

          {/* Step 4: Admin-Marked Compatible Store Add-Ons */}
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-semibold text-white">
                4. Add Compatible Fish &amp; Store Products
              </h2>
              <p className="text-xs text-slate-400">
                Select additional exotic fish, lights, stones, or tissue plants curated in the FINZO catalog.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={addonSearch}
                  onChange={(e) => setAddonSearch(e.target.value)}
                  placeholder="Filter compatible fish or gear..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
                />
              </div>
              <select
                value={addonRoleFilter}
                onChange={(e) => setAddonRoleFilter(e.target.value as 'all' | CustomAddonRole)}
                className="px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-slate-200 cursor-pointer"
              >
                <option value="all">All Compatible Roles</option>
                <option value="fish">Exotic Fish</option>
                <option value="lighting">Lighting</option>
                <option value="filtration">Filtration</option>
                <option value="rocks">Hardscape Rocks</option>
                <option value="plants">Aquatic Plants</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            {/* Selected Add-ons summary */}
            {addons.length > 0 && (
              <div className="rounded-2xl bg-cyan-400/8 border border-cyan-400/25 p-3.5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 block">
                  Selected Add-ons ({addons.length})
                </span>
                {addons.map((a) => (
                  <div key={a.productId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-white truncate">{a.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateAddonQty(a.productId, a.quantity - 1)}
                        className="p-1 rounded bg-[#040B16] text-slate-300 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-white w-4 text-center">{a.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateAddonQty(a.productId, a.quantity + 1)}
                        className="p-1 rounded bg-[#040B16] text-slate-300 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-cyan-200 w-16 text-right">
                        {formatINR(a.price * a.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateAddonQty(a.productId, 0)}
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        aria-label={`Remove ${a.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {compatibleStoreProducts.map((prod) => {
                const { currentPrice } = getEffectiveProductPrice(prod, prod.variants[0]);
                const existingAddon = addons.find((a) => a.productId === prod.id);
                return (
                  <div
                    key={prod.id}
                    className="rounded-xl bg-[#040B16]/75 border border-white/10 p-3 flex items-center gap-3"
                  >
                    <div className="w-14 rounded-lg overflow-hidden shrink-0">
                      <ResilientImage
                        src={prod.image}
                        alt={prod.name}
                        aspectClassName="aspect-[4/3]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{prod.category}</p>
                      <p className="font-mono text-xs text-cyan-200 tabular-nums">
                        {formatINR(currentPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddAddonProduct(prod)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0 ${
                        existingAddon
                          ? 'bg-cyan-400 text-[#040B16]'
                          : 'bg-cyan-400/15 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border border-cyan-400/30'
                      }`}
                    >
                      {existingAddon ? `Added (${existingAddon.quantity})` : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
