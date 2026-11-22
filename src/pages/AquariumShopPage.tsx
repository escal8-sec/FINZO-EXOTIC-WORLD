import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Layers, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { useRouter } from '../context/RouterContext';
import { getEffectiveProductPrice } from '../lib/currency';
import { ProductCard } from '../components/ProductCard';
import { Reveal, StaggerGrid, StaggerItem } from '../components/Reveal';
import { CatalogSkeletonGrid } from '../components/SkeletonLoaders';

type HardwarePriceRange = 'all' | 'under-5000' | '5000-25000' | 'above-25000';

export function AquariumShopPage() {
  const { products, activeCategories, isUsingDemoFallback, catalogLoading } = useCatalog();
  const { navigate, searchParams } = useRouter();
  const urlCategory = searchParams.get('category') || 'All';

  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [priceRange, setPriceRange] = useState<HardwarePriceRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  useEffect(() => {
    setSelectedCategory(urlCategory);
  }, [urlCategory]);

  const allHardware = useMemo(
    () => products.filter((p) => p.kind === 'aquarium' && p.isAvailable !== false),
    [products]
  );

  const categories = useMemo(() => {
    const adminCatNames = activeCategories
      .filter((c) => c.kind === 'aquarium')
      .map((c) => c.name);
    const productCatNames = allHardware.map((h) => h.category);
    const merged = Array.from(new Set([...adminCatNames, ...productCatNames]));
    return ['All', ...merged];
  }, [activeCategories, allHardware]);

  const hardwareList = useMemo(() => {
    const filtered = allHardware.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const effectivePrice = getEffectiveProductPrice(item).currentPrice;
      const matchesPrice =
        priceRange === 'all' ||
        (priceRange === 'under-5000' && effectivePrice < 5000) ||
        (priceRange === '5000-25000' && effectivePrice >= 5000 && effectivePrice <= 25000) ||
        (priceRange === 'above-25000' && effectivePrice > 25000);
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.originOrMaterial.toLowerCase().includes(q);
      return matchesCat && matchesPrice && matchesQuery;
    });

    if (sortBy === 'price-asc') {
      return [...filtered].sort(
        (a, b) => getEffectiveProductPrice(a).currentPrice - getEffectiveProductPrice(b).currentPrice
      );
    }
    if (sortBy === 'price-desc') {
      return [...filtered].sort(
        (a, b) => getEffectiveProductPrice(b).currentPrice - getEffectiveProductPrice(a).currentPrice
      );
    }
    return filtered;
  }, [allHardware, selectedCategory, priceRange, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
      <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
            Architectural Systems · {isUsingDemoFallback ? 'Demo Catalog' : 'Live Storefront'}
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white">
            Aquarium Shop
          </h1>
          <p className="text-slate-300/85 text-base leading-relaxed">
            Low-iron OptiClear rimless tanks, high-CRI RGBW pendant lights, aquascape stone, live tissue plants, and brushed 316L stainless filtration.
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/custom-aquarium')}
          className="px-5 py-3 rounded-xl bg-amber-300/15 hover:bg-amber-300/25 border border-amber-300/40 text-amber-200 text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap self-start lg:self-auto cursor-pointer transition-colors"
        >
          <Layers className="w-4 h-4" />
          Need Bespoke Dimensions? Build in 3D
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </Reveal>

      <Reveal delay={0.06} className="glass-panel rounded-2xl p-4 sm:p-5 mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter aquarium products">
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer btn-tactile ${
                  active ? 'text-[#040B16]' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="aq-category-pill"
                    className="absolute inset-0 rounded-lg bg-cyan-400"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tanks, filters, plants..."
              aria-label="Search aquarium products"
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value as HardwarePriceRange)}
            aria-label="Filter hardware by price"
            className="px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="all">All Prices (₹)</option>
            <option value="under-5000">Under ₹5,000</option>
            <option value="5000-25000">₹5,000 – ₹25,000</option>
            <option value="above-25000">Above ₹25,000</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
            aria-label="Sort aquarium hardware"
            className="px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="featured">Featured Order</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </Reveal>

      {catalogLoading && allHardware.length === 0 ? (
        <CatalogSkeletonGrid count={6} />
      ) : hardwareList.length === 0 ? (
        <Reveal variant="scale-in" className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <p className="text-lg font-medium text-white">No aquarium items match these filters</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setPriceRange('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer btn-tactile"
          >
            Reset Filters
          </button>
        </Reveal>
      ) : (
        <StaggerGrid
          key={`${selectedCategory}-${priceRange}-${sortBy}-${searchQuery}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {hardwareList.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
