import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Layers,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
  sanitizeId,
  truncateText,
} from '../lib/firebase';
import { formatINR, getEffectiveProductPrice } from '../lib/currency';
import { buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { useRouter } from '../context/RouterContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { ResilientImage } from '../components/ResilientImage';
import { ProductCard } from '../components/ProductCard';
import { Reveal, StaggerGrid, StaggerItem } from '../components/Reveal';
import { TiltCard } from '../components/TiltCard';
import { ProductReview } from '../types';

interface ProductDetailsPageProps {
  slug: string;
}

export function ProductDetailsPage({ slug }: ProductDetailsPageProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const { products, inventoryMap, ratingMap, storeSettings, isUsingDemoFallback } = useCatalog();
  const { user, customerProfile, isAdmin } = useAuth();
  const { isWishlisted, toggleWishlist, wishlistNotice, clearWishlistNotice } = useWishlist();

  const product = products.find((p) => p.slug === slug) ?? products[0];
  const gallery = product?.secondaryImages?.length
    ? Array.from(new Set([product.image, ...product.secondaryImages]))
    : product
    ? [product.image]
    : [];

  const [activeImage, setActiveImage] = useState(gallery[0] ?? '');
  const [selectedVariantId, setSelectedVariantId] = useState(product?.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const nextGallery = product.secondaryImages?.length
      ? Array.from(new Set([product.image, ...product.secondaryImages]))
      : [product.image];
    setActiveImage(nextGallery[0] ?? '');
    setSelectedVariantId(product.variants[0]?.id ?? '');
    setQuantity(1);
    setJustAdded(false);
    setReviewNotice(null);
    clearWishlistNotice();
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const q = query(collection(db, 'reviews'), where('productId', '==', product.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ ...(d.data() as ProductReview), id: d.id })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );
    return () => unsub();
  }, [product?.id]);

  if (!product) return null;

  const selectedVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ??
    product.variants?.[0] ?? {
      id: `${product.id}-std`,
      label: product.kind === 'fish' ? 'Standard Specimen' : 'Standard Configuration',
      price: product.price,
    };
  const inv = inventoryMap[product.id];
  const maxOrderQty = inv && inv.stockCount > 0 ? Math.min(99, inv.stockCount) : 99;
  const isOutOfStock =
    product.isAvailable === false ||
    (inv ? inv.stockCount <= 0 : product.availability === 'Out of Stock');
  const wishlisted = isWishlisted(product.id);

  const variantPricing = getEffectiveProductPrice(product, selectedVariant);
  const ratingSummary =
    ratingMap[product.id] ??
    (reviews.length > 0
      ? {
          average: Number(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          ),
          count: reviews.length,
        }
      : undefined);

  const related = products
    .filter((p) => p.kind === product.kind && p.id !== product.id && p.isAvailable !== false)
    .slice(0, 3);

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(product, selectedVariant, Math.min(quantity, maxOrderQty));
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/account');
      return;
    }
    if (!user.emailVerified) {
      setReviewNotice('Please verify your account email before publishing a review.');
      return;
    }
    if (isUsingDemoFallback) {
      setReviewNotice(
        'Reviews require the live catalog to be seeded in Firestore first (available in Admin Dashboard).'
      );
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length < 3) {
      setReviewNotice('Please write at least 3 characters.');
      return;
    }

    setSubmittingReview(true);
    setReviewNotice(null);
    const reviewId = sanitizeId(`rev_${product.id}_${user.uid}_${Date.now()}`, 128);
    const path = `reviews/${reviewId}`;

    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        id: reviewId,
        productId: sanitizeId(product.id, 128),
        customerId: user.uid,
        authorName: truncateText(
          customerProfile?.displayName || user.displayName || 'Collector',
          80
        ),
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        comment: truncateText(trimmed, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setComment('');
      setRating(5);
    } catch (error) {
      logFirestoreError(error, OperationType.CREATE, path);
      setReviewNotice(
        formatFirestoreUserError(error, 'Unable to publish review right now. Please try again.')
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setReviewNotice(null);
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
      setReviewNotice(
        formatFirestoreUserError(error, 'Unable to delete this review right now.')
      );
    }
  };

  const waHref = buildWhatsAppDirectUrl(
    storeSettings.whatsappNumber,
    `Hello ${storeSettings.storeName}, I would like specialist guidance on ${product.name} (${selectedVariant.label} — ${formatINR(variantPricing.currentPrice)}).`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <button
        type="button"
        onClick={() => navigate(product.kind === 'fish' ? '/fish' : '/aquariums')}
        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300 transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {product.kind === 'fish' ? 'Fish Collection' : 'Aquarium Shop'}
      </button>

      {wishlistNotice && (
        <div className="mb-6 rounded-xl bg-amber-400/10 border border-amber-300/30 px-4 py-3 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{wishlistNotice}</span>
          <button
            type="button"
            onClick={clearWishlistNotice}
            className="text-amber-100 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split: Sticky Gallery Left, Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Sticky Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
          <TiltCard maxTilt={3} glareOpacity={0.09} className="rounded-2xl">
            <div className="glass-panel rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0.65, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.65 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ResilientImage
                    src={activeImage}
                    alt={product.name}
                    aspectClassName="aspect-[4/3]"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </TiltCard>

          {gallery.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {gallery.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-24 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    activeImage === img
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30 opacity-100'
                      : 'border-white/10 opacity-65 hover:opacity-100'
                  }`}
                >
                  <ResilientImage
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    aspectClassName="aspect-[4/3]"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-7">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{product.originOrMaterial}</span>
                <span aria-hidden="true">·</span>
                <span className={isOutOfStock ? 'text-rose-300' : 'text-cyan-300'}>
                  {isOutOfStock ? 'Currently Unavailable' : product.availability}
                </span>
                {inv && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-cyan-200 tabular-nums">
                      {inv.stockCount} available ({inv.quarantineStatus})
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white leading-tight">
                  {product.name}
                </h1>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.06 }}
                  onClick={() => void toggleWishlist(product)}
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                    wishlisted
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                      : 'border-white/15 text-slate-300 hover:border-cyan-400/50 hover:text-white'
                  }`}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <motion.span
                    key={wishlisted ? 'liked' : 'unliked'}
                    initial={{ scale: 0.72 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    className="flex items-center justify-center"
                  >
                    <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-400 text-rose-300' : ''}`} />
                  </motion.span>
                </motion.button>
              </div>

              {product.scientificName && (
                <p className="text-sm italic text-amber-200/80 font-display text-lg">
                  {product.scientificName}
                </p>
              )}

              {/* Genuine Verified Customer Rating Summary */}
              {ratingSummary ? (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-0.5 text-amber-300">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(ratingSummary.average)
                            ? 'fill-amber-300 text-amber-300'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-amber-200 tabular-nums">
                    {ratingSummary.average.toFixed(1)}
                  </span>
                  <span className="text-slate-400">
                    ({ratingSummary.count} {ratingSummary.count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 pt-0.5">
                  No customer reviews yet
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-3xl font-semibold text-white tabular-nums">
                {formatINR(variantPricing.currentPrice)}
              </span>
              {variantPricing.hasDiscount && variantPricing.originalPrice && (
                <>
                  <span className="font-mono text-lg text-slate-500 line-through tabular-nums">
                    {formatINR(variantPricing.originalPrice)}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Save {Math.round(((variantPricing.originalPrice - variantPricing.currentPrice) / variantPricing.originalPrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed">
              {product.description}
            </p>

            {/* Delivery & Custom Builder Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  product.deliveryAvailable === false
                    ? 'bg-amber-400/10 border-amber-300/30 text-amber-200'
                    : 'bg-cyan-400/10 border-cyan-400/25 text-cyan-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                {product.deliveryAvailable === false
                  ? 'In-Store Gallery Pickup Only'
                  : 'Insulated Doorstep Delivery Available'}
              </span>

              {product.customAquariumCompatible && (
                <button
                  type="button"
                  onClick={() => navigate('/custom-aquarium')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-400/15 border border-white/15 hover:border-cyan-400/40 text-slate-200 cursor-pointer transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-300" />
                  Custom Tank Compatible →
                </button>
              )}
            </div>

            {/* Variant Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-slate-300 block">
                Select Size / Configuration
              </span>
              <div className="grid grid-cols-1 gap-2">
                {product.variants.map((variant) => {
                  const active = variant.id === selectedVariant.id;
                  const vp = getEffectiveProductPrice(product, variant);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        active
                          ? 'bg-cyan-400/12 border-cyan-400 text-white'
                          : 'bg-[#040B16]/50 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium block">{variant.label}</span>
                        {variant.note && (
                          <span className="text-xs text-slate-400">{variant.note}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-semibold tabular-nums text-cyan-200 block">
                          {formatINR(vp.currentPrice)}
                        </span>
                        {vp.hasDiscount && vp.originalPrice && (
                          <span className="font-mono text-[11px] text-slate-500 line-through tabular-nums">
                            {formatINR(vp.originalPrice)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Primary Action */}
            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center border border-white/15 rounded-xl bg-[#040B16]/70">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 text-slate-300 hover:text-white cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-mono text-sm text-white tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || quantity >= maxOrderQty}
                  onClick={() => setQuantity((q) => Math.min(maxOrderQty, q + 1))}
                  className="p-3 text-slate-300 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                type="button"
                disabled={isOutOfStock}
                whileTap={isOutOfStock ? undefined : { scale: 0.97 }}
                onClick={handleAdd}
                className="flex-1 py-3.5 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/15"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {justAdded ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Added to Bag
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {isOutOfStock ? 'Currently Unavailable' : 'Add to Cart'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl border border-white/15 hover:border-cyan-400/45 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-cyan-300" />
              Ask an Aquarist on WhatsApp
            </a>
          </div>

          {/* Specifications Table */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              {product.kind === 'fish' ? 'Ideal Water Parameters' : 'Technical Specifications'}
            </h2>
            <dl className="divide-y divide-white/10">
              {product.specs.map((spec) => (
                <div key={spec.label} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                  <dt className="text-slate-400">{spec.label}</dt>
                  <dd className="font-mono text-white tabular-nums text-right">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Care Notes */}
          {product.careNotes && product.careNotes.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-3">
              <h2 className="font-display text-2xl font-semibold text-white">
                Care &amp; Husbandry Notes
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-300/90 leading-relaxed">
                {product.careNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0" aria-hidden="true" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section (Genuine Firestore-backed Only) */}
      <section className="mt-16 pt-12 border-t border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
          <h2 className="font-display text-3xl font-semibold text-white">
            Collector Reviews
          </h2>
          <p className="text-sm text-slate-300/85">
            Share acclimation notes or tank pairing results for {product.name}. Ratings are calculated exclusively from genuine customer submissions.
          </p>

          {user ? (
            <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= rating ? 'fill-amber-300 text-amber-300' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your experience with this specimen or system..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />

              {reviewNotice && (
                <p className="text-xs text-amber-200">{reviewNotice}</p>
              )}

              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {submittingReview ? 'Publishing...' : 'Publish Review'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="px-5 py-2.5 rounded-xl border border-cyan-400/35 text-cyan-200 hover:bg-cyan-400/15 text-xs font-semibold cursor-pointer"
            >
              Sign In to Write a Review
            </button>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4">
          {reviews.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
              No reviews published for this item yet. Be the first collector to leave a review.
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="glass-panel rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{rev.authorName}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${
                            n <= rev.rating ? 'fill-amber-300 text-amber-300' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {(user?.uid === rev.customerId || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteReview(rev.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      aria-label="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Items */}
      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-white/10">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-8">
              Pair With Your Collection
            </h2>
          </Reveal>
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {related.map((item) => (
              <StaggerItem key={item.id}>
                <ProductCard product={item} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </section>
      )}
    </div>
  );
}
