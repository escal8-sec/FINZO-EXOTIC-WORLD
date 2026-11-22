import { useState } from 'react';
import { Check, Heart, Plus, Star, Truck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Product } from '../types';
import { useRouter } from '../context/RouterContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCatalog } from '../context/CatalogContext';
import { formatINR, getEffectiveProductPrice } from '../lib/currency';
import { ResilientImage } from './ResilientImage';
import { TiltCard } from './TiltCard';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { inventoryMap, ratingMap } = useCatalog();
  const [added, setAdded] = useState(false);

  const wishlisted = isWishlisted(product.id);
  const inv = inventoryMap[product.id];
  const isOutOfStock =
    product.isAvailable === false ||
    (inv ? inv.stockCount <= 0 : product.availability === 'Out of Stock');

  const primaryVariant = product.variants?.[0];
  const { currentPrice, originalPrice, hasDiscount } = getEffectiveProductPrice(
    product,
    primaryVariant
  );
  const ratingSummary = ratingMap[product.id];

  const handleQuickAdd = () => {
    if (isOutOfStock) return;
    addItem(product, primaryVariant, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <TiltCard maxTilt={4.5} glareOpacity={0.11} className="rounded-2xl">
      <article className="group glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-full">
        <div className="relative overflow-hidden">
          <button
            type="button"
            onClick={() => navigate(`/product/${product.slug}`)}
            className="relative block text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            aria-label={`View details for ${product.name}`}
          >
            <ResilientImage
              src={product.image}
              alt={product.name}
              aspectClassName="aspect-[4/3]"
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040B16]/90 via-[#040B16]/15 to-transparent transition-opacity duration-300 group-hover:opacity-90"
              aria-hidden="true"
            />
          </button>

          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              {product.badge && (
                <span className="text-[11px] font-medium tracking-wider uppercase text-amber-200 bg-[#040B16]/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-300/25">
                  {product.badge}
                </span>
              )}
              {hasDiscount && originalPrice && (
                <span className="text-[11px] font-semibold text-[#040B16] bg-cyan-300 px-2 py-0.5 rounded-md">
                  {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
                </span>
              )}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.84 }}
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => void toggleWishlist(product)}
              className={`pointer-events-auto w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                wishlisted
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                  : 'bg-[#040B16]/70 border-white/15 text-slate-200 hover:border-cyan-400/50 hover:text-white'
              }`}
              aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            >
              <motion.span
                key={wishlisted ? 'liked' : 'unliked'}
                initial={{ scale: 0.72 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="flex items-center justify-center"
              >
                <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-rose-400 text-rose-300' : ''}`} />
              </motion.span>
            </motion.button>
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className={isOutOfStock ? 'text-rose-300' : 'text-slate-300'}>
                {isOutOfStock ? 'Unavailable' : product.availability}
              </span>
              {inv && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-cyan-200/80 tabular-nums">
                    {inv.stockCount} left
                  </span>
                </>
              )}
              {product.deliveryAvailable === false && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-200/90">
                    <Truck className="w-3 h-3" /> Pickup Only
                  </span>
                </>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => navigate(`/product/${product.slug}`)}
                className="block text-left w-full group/title focus:outline-none focus-visible:underline cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-white tracking-tight leading-snug group-hover/title:text-cyan-300 transition-colors duration-200">
                  {product.name}
                </h3>
              </button>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-slate-400 italic font-display text-sm truncate">
                  {product.scientificName ?? product.originOrMaterial}
                </p>
                {ratingSummary && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-200 font-mono shrink-0">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    {ratingSummary.average} ({ratingSummary.count})
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-300/85 leading-relaxed line-clamp-2">
              {product.shortDescription}
            </p>

            <p className="font-mono text-[11px] text-cyan-200/80 tabular-nums pt-0.5">
              {product.highlightSpec}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Starting at</span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-base font-medium text-white tabular-nums">
                  {formatINR(currentPrice)}
                </span>
                {hasDiscount && originalPrice && (
                  <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                    {formatINR(originalPrice)}
                  </span>
                )}
              </div>
            </div>

            <motion.button
              type="button"
              disabled={isOutOfStock}
              whileTap={isOutOfStock ? undefined : { scale: 0.95 }}
              transition={{ duration: 0.14 }}
              onClick={handleQuickAdd}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-45 disabled:cursor-not-allowed ${
                added
                  ? 'bg-cyan-400 text-[#040B16] border-cyan-300 shadow-md shadow-cyan-500/25'
                  : 'bg-cyan-400/12 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border-cyan-400/30'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Added
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
