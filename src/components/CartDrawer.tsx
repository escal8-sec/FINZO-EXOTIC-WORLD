import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import { formatINR } from '../lib/currency';
import { ResilientImage } from './ResilientImage';

export function CartDrawer() {
  const { user } = useAuth();
  const { items, isDrawerOpen, closeDrawer, updateQuantity, removeItem, subtotal, totalItems } =
    useCart();
  const { navigate } = useRouter();

  const goToCart = () => {
    closeDrawer();
    navigate('/cart');
  };

  const navigateItem = (itemSlug: string, itemType?: 'product' | 'custom_aquarium') => {
    closeDrawer();
    if (itemType === 'custom_aquarium' || itemSlug === 'custom-aquarium') {
      navigate('/custom-aquarium');
    } else {
      navigate(`/product/${itemSlug}`);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-[#02060D]/75 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Slide-over drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[#061325] border-l border-white/10 shadow-2xl flex flex-col h-full"
            aria-label="Shopping Bag"
          >
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-cyan-300" />
                <h2 className="font-display text-2xl font-semibold text-white">
                  Your Selection
                </h2>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  ({totalItems})
                </span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={closeDrawer}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close shopping bag"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center animate-float-gentle">
                    <ShoppingBag className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-white">Your aquarium bag is empty</p>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                      Explore quarantined exotic fish, low-iron rimless tanks, or build a custom 3D aquarium.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        navigate('/fish');
                      }}
                      className="px-4 py-2 rounded-lg bg-cyan-400 text-[#040B16] text-xs font-semibold hover:bg-cyan-300 transition-colors cursor-pointer btn-tactile"
                    >
                      Explore Fish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        navigate('/custom-aquarium');
                      }}
                      className="px-4 py-2 rounded-lg border border-cyan-400/35 text-cyan-200 text-xs font-semibold hover:bg-cyan-400/10 transition-colors cursor-pointer btn-tactile"
                    >
                      Custom Aquarium
                    </button>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={`${item.productId}-${item.variantId}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="glass-panel rounded-xl p-3.5 flex gap-3.5 items-center"
                    >
                      <button
                        type="button"
                        onClick={() => navigateItem(item.slug, item.itemType)}
                        className="w-20 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer group"
                      >
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          aspectClassName="w-full h-full"
                          className="transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigateItem(item.slug, item.itemType)}
                          className="text-sm font-semibold text-white hover:text-cyan-300 transition-colors text-left truncate block w-full cursor-pointer"
                        >
                          {item.name}
                        </button>
                        <p className="text-xs text-slate-400 truncate">{item.variantLabel}</p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center border border-white/15 rounded-md bg-[#040B16]/60">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              className="p-1.5 text-slate-300 hover:text-white cursor-pointer btn-tactile"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 font-mono text-xs text-white tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              className="p-1.5 text-slate-300 hover:text-white cursor-pointer btn-tactile"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-white tabular-nums">
                              {formatINR(item.price * item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId, item.variantId)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer btn-tactile"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-[#040B16]/90 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Subtotal</span>
                  <span className="font-mono text-lg font-semibold text-white tabular-nums">
                    {formatINR(subtotal)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {user
                    ? 'Synced to your account. Proceed to checkout to pin your delivery location and confirm your order.'
                    : 'Saved locally in your browser. Proceed to checkout to complete your delivery address and order.'}
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={goToCart}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/15"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
