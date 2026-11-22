import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  collection,
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
import { calculateCustomAquariumPricing } from '../lib/customAquariumPricing';
import { evaluateDelivery } from '../lib/delivery';
import { buildWhatsAppDirectUrl, dispatchWhatsAppOrderNotification } from '../lib/whatsapp';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { ResilientImage } from '../components/ResilientImage';
import {
  AddressLocationPicker,
  StructuredDeliveryAddress,
} from '../components/AddressLocationPicker';
import { CartItem, CustomerAddress, DeliveryMode, OrderRecord } from '../types';

export function CartPage() {
  const { items, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const { navigate } = useRouter();
  const { user, customerProfile } = useAuth();
  const { products, inventoryMap, promotions, storeSettings } = useCatalog();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('standard');
  const enabledPaymentMethods = useMemo(
    () => storeSettings.paymentMethods.filter((m) => m.isEnabled),
    [storeSettings.paymentMethods]
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(
    enabledPaymentMethods[0]?.id || 'cod'
  );

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    order: OrderRecord;
    waResult: {
      sent: boolean;
      configured: boolean;
      waLink: string;
      messageText: string;
      error?: string;
    };
  } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (
      enabledPaymentMethods.length > 0 &&
      !enabledPaymentMethods.some((m) => m.id === selectedPaymentId)
    ) {
      setSelectedPaymentId(enabledPaymentMethods[0].id);
    }
  }, [enabledPaymentMethods, selectedPaymentId]);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setSelectedAddressId('');
      return;
    }
    const q = query(collection(db, 'addresses'), where('customerId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as CustomerAddress), id: d.id }));
        setAddresses(list);
        setSelectedAddressId((currentId) => {
          if (list.length === 0) return '';
          if (currentId && list.some((a) => a.id === currentId)) return currentId;
          return (list.find((a) => a.isDefault) ?? list[0]).id;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'addresses');
      }
    );
    return () => unsub();
  }, [user]);

  const { authoritativeItems, subtotal, stockIssues } = useMemo(() => {
    const issues: string[] = [];
    const verifiedItems: CartItem[] = items.map((item) => {
      if (item.itemType === 'custom_aquarium' && item.customAquarium) {
        const spec = item.customAquarium;
        const verifiedAddons = (spec.addons || []).map((addon) => {
          const liveAddonProd = products.find((p) => p.id === addon.productId);
          if (!liveAddonProd) return addon;
          const livePrice = getEffectiveProductPrice(
            liveAddonProd,
            liveAddonProd.variants?.[0]
          ).currentPrice;
          return { ...addon, price: livePrice };
        });
        const breakdown = calculateCustomAquariumPricing(
          {
            lengthCm: spec.lengthCm,
            widthCm: spec.widthCm,
            heightCm: spec.heightCm,
            glassThicknessMm: spec.glassThicknessMm,
            shape: spec.shape,
            glassFinish: spec.glassFinish,
            backingColor: spec.backingColor,
            stand: spec.stand,
            lighting: spec.lighting,
            filtration: spec.filtration,
            substrate: spec.substrate,
            plants: spec.plants,
            hardscape: spec.hardscape,
            livestock: spec.livestock,
            plumbingKit: spec.plumbingKit,
            addons: verifiedAddons,
          },
          storeSettings.customAquariumConfig
        );
        return {
          ...item,
          price: breakdown.aquariumTotalBeforeDelivery,
          customAquarium: {
            ...spec,
            addons: verifiedAddons,
            breakdown,
          },
        };
      }

      const liveProduct = products.find((p) => p.id === item.productId);
      if (!liveProduct) {
        issues.push(`"${item.name}" is no longer in the active catalog.`);
        return item;
      }
      const inv = inventoryMap[liveProduct.id];
      const outOfStock =
        liveProduct.isAvailable === false ||
        (inv ? inv.stockCount <= 0 : liveProduct.availability === 'Out of Stock');
      if (outOfStock) {
        issues.push(`"${liveProduct.name}" is currently unavailable or out of stock.`);
      } else if (inv && item.quantity > inv.stockCount) {
        issues.push(
          `"${liveProduct.name}" only has ${inv.stockCount} in stock (you selected ${item.quantity}).`
        );
      }

      const matchedVariant =
        liveProduct.variants?.find((v) => v.id === item.variantId) ??
        liveProduct.variants?.[0];
      const { currentPrice } = getEffectiveProductPrice(liveProduct, matchedVariant);
      return {
        ...item,
        price: currentPrice,
      };
    });

    const computedSubtotal = verifiedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
    return {
      authoritativeItems: verifiedItems,
      subtotal: computedSubtotal,
      stockIssues: issues,
    };
  }, [items, products, inventoryMap, storeSettings.customAquariumConfig]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const activePromo = promotions.find(
    (p) => p.isActive && p.code === appliedPromoCode && subtotal >= p.minOrderAmount
  );
  const discountAmount = activePromo
    ? Math.round((subtotal * activePromo.discountPercent) / 100)
    : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  const deliveryEval = useMemo(
    () =>
      evaluateDelivery({
        items: authoritativeItems,
        products,
        subtotalAfterDiscount,
        pinCode: selectedAddress?.pinCode || selectedAddress?.postalCode || '',
        district: selectedAddress?.district || selectedAddress?.city || '',
        requestedMode: deliveryMode,
        shippingAvailable: storeSettings.shippingAvailable,
        config: storeSettings.deliveryConfig,
      }),
    [
      authoritativeItems,
      products,
      subtotalAfterDiscount,
      selectedAddress,
      deliveryMode,
      storeSettings.shippingAvailable,
      storeSettings.deliveryConfig,
    ]
  );

  const finalTotal = subtotalAfterDiscount + deliveryEval.totalDeliveryCharge;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const match = promotions.find((p) => p.isActive && p.code === code);
    if (!match) {
      setPromoFeedback('Promo code not found or inactive.');
      setAppliedPromoCode(null);
      return;
    }
    if (subtotal < match.minOrderAmount) {
      setPromoFeedback(
        `Minimum order of ${formatINR(match.minOrderAmount)} required for ${match.code}.`
      );
      setAppliedPromoCode(null);
      return;
    }
    setAppliedPromoCode(match.code);
    setPromoFeedback(`${match.code} applied (${match.discountPercent}% off).`);
  };

  const handleSaveStructuredAddress = async (addr: StructuredDeliveryAddress) => {
    if (!user) return;
    const id = sanitizeId(`addr_${user.uid}_${Date.now()}`, 128);
    const payload: Record<string, unknown> = {
      id,
      customerId: user.uid,
      label: truncateText(addr.label || 'Home', 40),
      recipientName: truncateText(addr.fullName || customerProfile?.displayName || 'Recipient', 100),
      fullName: truncateText(addr.fullName, 100),
      mobile: truncateText(addr.mobile, 30),
      email: truncateText(addr.email || user.email || '', 160),
      buildingName: truncateText(addr.buildingName, 160),
      street: truncateText(addr.street, 200),
      area: truncateText(addr.area, 120),
      district: truncateText(addr.district, 80),
      city: truncateText(addr.city || addr.district, 80),
      state: truncateText(addr.state, 80),
      postalCode: truncateText(addr.pinCode, 24),
      pinCode: truncateText(addr.pinCode, 24),
      country: truncateText(addr.country || 'India', 80),
      phone: truncateText(addr.mobile, 30),
      deliveryInstructions: truncateText(addr.deliveryInstructions, 300),
      isDefault: addresses.length === 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof addr.lat === 'number' && typeof addr.lng === 'number') {
      payload.lat = addr.lat;
      payload.lng = addr.lng;
    }
    if (addr.placeId) {
      payload.placeId = truncateText(addr.placeId, 200);
    }
    if (addr.formattedAddress) {
      payload.formattedAddress = truncateText(addr.formattedAddress, 300);
    }

    try {
      await setDoc(doc(db, 'addresses', id), payload);
      setSelectedAddressId(id);
      setShowNewAddress(false);
    } catch (error) {
      logFirestoreError(error, OperationType.CREATE, `addresses/${id}`);
      throw new Error(
        formatFirestoreUserError(error, 'Unable to save delivery address. Please verify your account and retry.')
      );
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/account');
      return;
    }
    if (!user.emailVerified) {
      setOrderError('Please verify your email address before placing an order.');
      return;
    }
    if (!selectedAddress) {
      setOrderError('Please select or pin a delivery address first.');
      return;
    }
    if (stockIssues.length > 0) {
      setOrderError(stockIssues[0]);
      return;
    }
    if (!deliveryEval.serviceable) {
      setOrderError(deliveryEval.reason || 'Delivery is currently unavailable for this selection.');
      return;
    }
    if (authoritativeItems.length === 0) return;

    setPlacingOrder(true);
    setOrderError(null);

    const orderId = sanitizeId(`ord_${user.uid}_${Date.now()}`, 128);
    const orderNumber = `FNZ-${Date.now().toString().slice(-6)}`;
    const hasCustom = authoritativeItems.some((i) => i.itemType === 'custom_aquarium');
    const hasStandard = authoritativeItems.some((i) => i.itemType !== 'custom_aquarium');
    const orderType: OrderRecord['orderType'] =
      hasCustom && hasStandard ? 'mixed' : hasCustom ? 'custom_aquarium' : 'standard';

    const paymentObj =
      enabledPaymentMethods.find((m) => m.id === selectedPaymentId) ?? enabledPaymentMethods[0];
    const paymentMethodLabel = paymentObj?.label || 'Pay via WhatsApp Confirmation';
    const paymentStatus: OrderRecord['paymentStatus'] =
      selectedPaymentId === 'cod' ? 'cod_scheduled' : 'pending_confirmation';

    const cleanAddress: Record<string, unknown> = {
      label: selectedAddress.label,
      recipientName: selectedAddress.recipientName,
      fullName: selectedAddress.fullName || selectedAddress.recipientName,
      mobile: selectedAddress.mobile || selectedAddress.phone,
      email: selectedAddress.email || user.email || 'collector@finzoexoticworld.in',
      street: selectedAddress.street,
      city: selectedAddress.city,
      state: selectedAddress.state,
      postalCode: selectedAddress.postalCode,
      pinCode: selectedAddress.pinCode || selectedAddress.postalCode,
      country: selectedAddress.country,
      phone: selectedAddress.phone,
    };
    if (selectedAddress.buildingName) cleanAddress.buildingName = selectedAddress.buildingName;
    if (selectedAddress.area) cleanAddress.area = selectedAddress.area;
    if (selectedAddress.district) cleanAddress.district = selectedAddress.district;
    if (selectedAddress.deliveryInstructions) {
      cleanAddress.deliveryInstructions = selectedAddress.deliveryInstructions;
    }
    if (typeof selectedAddress.lat === 'number' && typeof selectedAddress.lng === 'number') {
      cleanAddress.lat = selectedAddress.lat;
      cleanAddress.lng = selectedAddress.lng;
    }
    if (selectedAddress.placeId) cleanAddress.placeId = selectedAddress.placeId;
    if (selectedAddress.formattedAddress) {
      cleanAddress.formattedAddress = selectedAddress.formattedAddress;
    }

    const firstCustomSpec = authoritativeItems.find((i) => i.itemType === 'custom_aquarium')?.customAquarium;

    const orderPayload: Record<string, unknown> = {
      id: orderId,
      orderNumber,
      orderType,
      customerId: user.uid,
      customerName: truncateText(
        selectedAddress.fullName ||
          customerProfile?.displayName ||
          user.displayName ||
          selectedAddress.recipientName,
        100
      ),
      customerEmail: truncateText(
        user.email || selectedAddress.email || 'collector@finzoexoticworld.in',
        160
      ),
      customerPhone: truncateText(
        selectedAddress.mobile || selectedAddress.phone || customerProfile?.phone || '',
        30
      ),
      items: authoritativeItems.slice(0, 30),
      shippingAddress: cleanAddress,
      subtotal,
      deliveryCharge: deliveryEval.totalDeliveryCharge,
      deliveryMode: deliveryEval.mode,
      discountAmount,
      totalAmount: finalTotal,
      paymentMethod: truncateText(paymentMethodLabel, 60),
      paymentStatus,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (activePromo) {
      orderPayload.promoCode = activePromo.code;
    }
    if (firstCustomSpec) {
      orderPayload.customAquarium = firstCustomSpec;
    }

    try {
      await setDoc(doc(db, 'orders', orderId), orderPayload);

      const localOrderRecord: OrderRecord = {
        ...(orderPayload as unknown as OrderRecord),
      };
      const waResult = await dispatchWhatsAppOrderNotification(
        localOrderRecord,
        storeSettings.whatsappNumber
      );

      clearCart();
      setConfirmedOrder({ order: localOrderRecord, waResult });
    } catch (error) {
      logFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
      setOrderError(
        formatFirestoreUserError(error, 'Unable to place your order right now. Please try again.')
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (confirmedOrder) {
    const { order, waResult } = confirmedOrder;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-cyan-300 mx-auto" />
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
              Order Recorded in Cloud Firestore
            </p>
            <h1 className="font-display text-4xl font-semibold text-white">
              Order {order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`}
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Your order has been stored cleanly with status{' '}
              <strong className="text-cyan-200">Pending</strong> and payment state{' '}
              <strong className="text-white">{order.paymentMethod}</strong>.
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 border text-xs ${
              waResult.sent
                ? 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200'
                : 'bg-cyan-400/10 border-cyan-400/30 text-cyan-100'
            }`}
          >
            {waResult.sent
              ? `Direct WhatsApp Cloud API notification dispatched to ${storeSettings.whatsappNumber}.`
              : waResult.configured
              ? `Cloud WhatsApp API dispatch returned an error (${waResult.error || 'Unknown'}). Use the direct WhatsApp button below to transmit your order summary.`
              : `WhatsApp Cloud API webhook is not configured on this server. Tap "Send Order to Store on WhatsApp" below to dispatch the formatted order sheet directly to ${storeSettings.whatsappNumber}.`}
          </div>

          <div className="rounded-2xl bg-[#040B16]/85 border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Formatted WhatsApp Order Summary
              </span>
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard
                      .writeText(waResult.messageText)
                      .then(() => {
                        setCopiedMsg(true);
                        window.setTimeout(() => setCopiedMsg(false), 1800);
                      })
                      .catch(() => {});
                  }
                }}
                className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedMsg ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {waResult.messageText}
            </pre>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={waResult.waLink}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Send Order to Store on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer"
            >
              Track in My Orders
            </button>
            <button
              type="button"
              onClick={() => navigate('/fish')}
              className="px-6 py-3.5 rounded-xl border border-white/15 text-white text-xs font-semibold cursor-pointer"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cartSummaryLines = authoritativeItems
    .map(
      (item) =>
        `• ${item.name} (${item.variantLabel}) × ${item.quantity} — ${formatINR(
          item.price * item.quantity
        )}`
    )
    .join('\n');
  const whatsappPreviewHref = buildWhatsAppDirectUrl(
    storeSettings.whatsappNumber,
    `Hello ${storeSettings.storeName}, I would like assistance with my cart:\n\n${cartSummaryLines}\n\nEstimated Total: ${formatINR(
      finalTotal
    )}`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
            {user ? 'Verified Checkout' : 'Selection Summary'}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white">
            Shopping Cart &amp; Checkout
          </h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Clear All Items
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 sm:p-16 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-cyan-300" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold text-white">
              Your cart is currently empty
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Browse our exotic ornamental fish showcase, architectural aquarium hardware, or design a custom tank in 3D.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/fish')}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold transition-colors cursor-pointer"
            >
              Explore Exotic Fish
            </button>
            <button
              type="button"
              onClick={() => navigate('/custom-aquarium')}
              className="px-6 py-3 rounded-xl border border-amber-300/40 bg-amber-300/10 text-amber-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              Build Custom Aquarium
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Cart Items + Maps Delivery Location + Delivery Mode + Payment Method */}
          <div className="lg:col-span-8 space-y-6">
            {/* Cart Items List */}
            <div className="space-y-4">
              {authoritativeItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          item.itemType === 'custom_aquarium'
                            ? '/custom-aquarium'
                            : `/product/${item.slug}`
                        )
                      }
                      className="w-full sm:w-32 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                    >
                      <ResilientImage
                        src={item.image}
                        alt={item.name}
                        aspectClassName="aspect-[4/3]"
                      />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-xs text-cyan-300">{item.category}</span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            item.itemType === 'custom_aquarium'
                              ? '/custom-aquarium'
                              : `/product/${item.slug}`
                          )
                        }
                        className="block text-left text-xl font-semibold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        {item.name}
                      </button>
                      <p className="text-sm text-slate-300">{item.variantLabel}</p>
                      <p className="font-mono text-xs text-slate-400 tabular-nums pt-1">
                        Unit price: {formatINR(item.price)}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3">
                      <div className="inline-flex items-center border border-white/15 rounded-xl bg-[#040B16]/70">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                          className="p-2.5 text-slate-300 hover:text-white cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3.5 font-mono text-sm text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity + 1)
                          }
                          className="p-2.5 text-slate-300 hover:text-white cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-semibold text-white tabular-nums">
                          {formatINR(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Aquarium Expanded Configuration Specs */}
                  {item.itemType === 'custom_aquarium' && item.customAquarium && (
                    <div className="pt-3 border-t border-white/10 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <p>
                        <span className="text-slate-400">Stand &amp; Glass:</span>{' '}
                        {item.customAquarium.stand} · {item.customAquarium.glassFinish}
                      </p>
                      <p>
                        <span className="text-slate-400">Light &amp; Filter:</span>{' '}
                        {item.customAquarium.lighting} · {item.customAquarium.filtration}
                      </p>
                      <p>
                        <span className="text-slate-400">Aquascape:</span>{' '}
                        {item.customAquarium.substrate} · {item.customAquarium.hardscape} ·{' '}
                        {item.customAquarium.plants}
                      </p>
                      <p>
                        <span className="text-slate-400">Livestock:</span>{' '}
                        {item.customAquarium.livestock}
                      </p>
                      {item.customAquarium.addons.length > 0 && (
                        <p className="sm:col-span-2 text-cyan-200">
                          <span className="text-slate-400">Added Store Products:</span>{' '}
                          {item.customAquarium.addons
                            .map((a) => `${a.name} × ${a.quantity} (${formatINR(a.price * a.quantity)})`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Delivery Address + Google Maps Pin Picker */}
            {user && (
              <div className="glass-panel rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-300" />
                    <h2 className="font-display text-2xl font-semibold text-white">
                      Delivery Location &amp; Google Maps Pin
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewAddress((prev) => !prev)}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    {showNewAddress ? 'Cancel' : '+ Add / Pin Address'}
                  </button>
                </div>

                {addresses.length > 0 && !showNewAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                          selectedAddressId === addr.id
                            ? 'bg-cyan-400/12 border-cyan-400 text-white'
                            : 'bg-[#040B16]/55 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            {addr.label}
                          </span>
                          {typeof addr.lat === 'number' && (
                            <span className="text-[10px] text-emerald-300 font-mono">
                              GPS Pin Saved
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white">
                          {addr.fullName || addr.recipientName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {[addr.buildingName, addr.street, addr.area, addr.city, addr.state]
                            .filter(Boolean)
                            .join(', ')}{' '}
                          — {addr.pinCode || addr.postalCode}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {addr.mobile || addr.phone}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {(showNewAddress || addresses.length === 0) && (
                  <AddressLocationPicker
                    initialValue={{
                      fullName: customerProfile?.displayName || user.displayName || '',
                      mobile: customerProfile?.phone || '',
                      email: user.email || '',
                    }}
                    onSave={handleSaveStructuredAddress}
                    onCancel={addresses.length > 0 ? () => setShowNewAddress(false) : undefined}
                  />
                )}
              </div>
            )}

            {/* Delivery Option & Payment Method Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-300" />
                  <h2 className="font-display text-2xl font-semibold text-white">
                    Delivery Method
                  </h2>
                </div>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'standard',
                        title: 'Pan-India Courier / Insulated Transit',
                        sub: `Base ${formatINR(storeSettings.deliveryConfig.standardDeliveryCharge)} (Free over ${formatINR(
                          storeSettings.deliveryConfig.freeDeliveryThreshold
                        )})`,
                      },
                      {
                        id: 'local',
                        title: 'Local Express Same-Day Delivery',
                        sub: `Local zone (${storeSettings.deliveryConfig.localDistricts.join(', ')}) — ${formatINR(
                          storeSettings.deliveryConfig.localDeliveryCharge
                        )}`,
                      },
                      ...(storeSettings.deliveryConfig.pickupAvailable
                        ? [
                            {
                              id: 'pickup',
                              title: storeSettings.deliveryConfig.pickupLabel,
                              sub: 'Zero delivery fee — inspect specimens in gallery',
                            },
                          ]
                        : []),
                    ] as Array<{ id: DeliveryMode; title: string; sub: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDeliveryMode(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        deliveryMode === opt.id
                          ? 'bg-cyan-400/12 border-cyan-400 text-white'
                          : 'bg-[#040B16]/55 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-300" />
                  <h2 className="font-display text-2xl font-semibold text-white">
                    Payment Method
                  </h2>
                </div>
                <div className="space-y-2">
                  {enabledPaymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentId(method.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedPaymentId === method.id
                          ? 'bg-cyan-400/12 border-cyan-400 text-white'
                          : 'bg-[#040B16]/55 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <p className="text-xs font-semibold">{method.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{method.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/fish')}
              className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300 transition-colors pt-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Browsing Collection
            </button>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <aside className="lg:col-span-4 glass-panel rounded-2xl p-6 sm:p-7 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-semibold text-white">
              Order Summary
            </h2>

            {/* Promo Code */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo code (e.g. FINZO10)"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-xs text-white uppercase placeholder:normal-case placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 rounded-lg border border-white/15 hover:border-cyan-400 text-xs font-semibold text-white cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {promoFeedback && (
                <p className="text-xs text-cyan-200">{promoFeedback}</p>
              )}
            </div>

            <dl className="space-y-2.5 text-sm border-y border-white/10 py-4">
              <div className="flex justify-between">
                <dt className="text-slate-400">Items ({totalItems})</dt>
                <dd className="font-mono text-white tabular-nums">{formatINR(subtotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <dt>Promo Discount</dt>
                  <dd className="font-mono tabular-nums">-{formatINR(discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">
                  Delivery ({deliveryEval.mode})
                </dt>
                <dd className="font-mono text-white tabular-nums">
                  {deliveryEval.freeDeliveryApplied && deliveryEval.baseDeliveryCharge === 0
                    ? 'Free Base'
                    : formatINR(deliveryEval.baseDeliveryCharge)}
                </dd>
              </div>
              {deliveryEval.liveFishPackingCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-400">Oxygenated Live Fish Packing</dt>
                  <dd className="font-mono text-cyan-200 tabular-nums">
                    +{formatINR(deliveryEval.liveFishPackingCharge)}
                  </dd>
                </div>
              )}
              {deliveryEval.customAquariumDeliveryCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-400">Crated Custom Tank Transit</dt>
                  <dd className="font-mono text-cyan-200 tabular-nums">
                    +{formatINR(deliveryEval.customAquariumDeliveryCharge)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10">
                <dt className="text-white font-semibold">Final Total</dt>
                <dd className="font-mono text-xl font-semibold text-white tabular-nums">
                  {formatINR(finalTotal)}
                </dd>
              </div>
            </dl>

            {stockIssues.length > 0 && (
              <div className="rounded-xl bg-rose-500/12 border border-rose-400/35 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {stockIssues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              </div>
            )}

            {!deliveryEval.serviceable && deliveryEval.reason && (
              <div className="rounded-xl bg-rose-500/12 border border-rose-400/35 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deliveryEval.reason}</span>
              </div>
            )}

            {orderError && <p className="text-xs text-rose-300">{orderError}</p>}

            {user ? (
              <button
                type="button"
                disabled={placingOrder || !deliveryEval.serviceable || stockIssues.length > 0}
                onClick={() => void handlePlaceOrder()}
                className="w-full py-3.5 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {placingOrder ? 'Confirming & Saving Order...' : 'Place Order'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="w-full py-3.5 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm transition-colors cursor-pointer"
              >
                Sign In to Complete Checkout
              </button>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {storeSettings.deliveryConfig.deliveryNotes}
            </p>

            <a
              href={whatsappPreviewHref}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl border border-white/15 hover:border-cyan-400/45 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-cyan-300" />
              Share Cart with Specialist on WhatsApp
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
