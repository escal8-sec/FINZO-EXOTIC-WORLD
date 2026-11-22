import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { useRouter } from '../context/RouterContext';
import { getEffectiveProductPrice } from '../lib/currency';
import { ProductCard } from '../components/ProductCard';
import { Reveal, StaggerGrid, StaggerItem } from '../components/Reveal';
import { CatalogSkeletonGrid } from '../components/SkeletonLoaders';

type PriceRangeKey = 'all' | 'under-2500' | '2500-7500' | 'above-7500';

export function FishCollectionPage() {
  const { products, activeCategories, isUsingDemoFallback, catalogLoading } = useCatalog();
  const { searchParams } = useRouter();
  const urlCategory = searchParams.get('category') || 'All';

  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<PriceRangeKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  useEffect(() => {
    setSelectedCategory(urlCategory);
  }, [urlCategory]);

  const allFish = useMemo(
    () => products.filter((p) => p.kind === 'fish' && p.isAvailable !== false),
    [products]
  );

  const categories = useMemo(() => {
    const adminCatNames = activeCategories
      .filter((c) => c.kind === 'fish')
      .map((c) => c.name);
    const productCatNames = allFish.map((f) => f.category);
    const merged = Array.from(new Set([...adminCatNames, ...productCatNames]));
    return ['All', ...merged];
  }, [activeCategories, allFish]);

  const fishList = useMemo(() => {
    const filtered = allFish.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesAvail =
        availabilityFilter === 'All' || item.availability === availabilityFilter;
      const effectivePrice = getEffectiveProductPrice(item).currentPrice;
      const matchesPrice =
        priceRange === 'all' ||
        (priceRange === 'under-2500' && effectivePrice < 2500) ||
        (priceRange === '2500-7500' && effectivePrice >= 2500 && effectivePrice <= 7500) ||
        (priceRange === 'above-7500' && effectivePrice > 7500);

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.scientificName && item.scientificName.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.originOrMaterial.toLowerCase().includes(q);
      return matchesCat && matchesAvail && matchesPrice && matchesQuery;
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
  }, [allFish, selectedCategory, availabilityFilter, priceRange, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
      <Reveal className="max-w-3xl space-y-3 mb-10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
          Exotic Ornamental Collection · {isUsingDemoFallback ? 'Demo Catalog' : 'Live Storefront'}
        </p>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white">
          Curated Exotic Fish
        </h1>
        <p className="text-slate-300/85 text-base leading-relaxed">
          Each specimen completes our 14-day biological quarantine and gentle mineral conditioning before entering our collection showcase.
        </p>
      </Reveal>

      {/* Filter & Search Bar */}
      <Reveal delay={0.06} className="glass-panel rounded-2xl p-4 sm:p-5 mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter fish by species group">
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
                    layoutId="fish-category-pill"
                    className="absolute inset-0 rounded-lg bg-cyan-400"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search species, scientific name..."
              aria-label="Search exotic fish species"
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            aria-label="Filter by availability"
            className="px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="All">All Availability</option>
            <option value="In Stock">In Stock</option>
            <option value="Quarantine Ready">Quarantine Ready</option>
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value as PriceRangeKey)}
            aria-label="Filter by price range"
            className="px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="all">All Prices (₹)</option>
            <option value="under-2500">Under ₹2,500</option>
            <option value="2500-7500">₹2,500 – ₹7,500</option>
            <option value="above-7500">Above ₹7,500</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
            aria-label="Sort fish collection"
            className="px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="featured">Featured Order</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </Reveal>

      {catalogLoading && allFish.length === 0 ? (
        <CatalogSkeletonGrid count={6} />
      ) : fishList.length === 0 ? (
        <Reveal variant="scale-in" className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <p className="text-lg font-medium text-white">No matching species found</p>
          <p className="text-sm text-slate-400">
            Try clearing your search term, selecting another price range, or resetting categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setAvailabilityFilter('All');
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
          key={`${selectedCategory}-${availabilityFilter}-${priceRange}-${sortBy}-${searchQuery}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {fishList.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
