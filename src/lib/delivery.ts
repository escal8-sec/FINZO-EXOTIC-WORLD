import { CartItem, DeliveryMode, DeliveryPricingConfig, Product } from '../types';

export interface DeliveryEvaluation {
  serviceable: boolean;
  reason?: string;
  mode: DeliveryMode;
  baseDeliveryCharge: number;
  liveFishPackingCharge: number;
  customAquariumDeliveryCharge: number;
  totalDeliveryCharge: number;
  freeDeliveryApplied: boolean;
}

export function evaluateDelivery(params: {
  items: CartItem[];
  products: Product[];
  subtotalAfterDiscount: number;
  pinCode: string;
  district: string;
  requestedMode: DeliveryMode;
  shippingAvailable: boolean;
  config: DeliveryPricingConfig;
}): DeliveryEvaluation {
  const {
    items,
    products,
    subtotalAfterDiscount,
    pinCode,
    district,
    requestedMode,
    shippingAvailable,
    config,
  } = params;

  const normalizedPin = pinCode.trim().replace(/\s+/g, '');
  const normalizedDistrict = district.trim().toLowerCase();

  const hasCustomAquarium = items.some((i) => i.itemType === 'custom_aquarium');
  const hasLiveFish = items.some((i) => {
    if (i.itemType === 'custom_aquarium') {
      return i.customAquarium?.livestock !== 'None';
    }
    const p = products.find((prod) => prod.id === i.productId);
    return p?.kind === 'fish' || i.kind === 'fish';
  });

  if (requestedMode === 'pickup') {
    if (!config.pickupAvailable) {
      return {
        serviceable: false,
        reason: 'Shop pickup is currently disabled by store administration.',
        mode: 'pickup',
        baseDeliveryCharge: 0,
        liveFishPackingCharge: 0,
        customAquariumDeliveryCharge: 0,
        totalDeliveryCharge: 0,
        freeDeliveryApplied: false,
      };
    }
    return {
      serviceable: true,
      mode: 'pickup',
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  if (!shippingAvailable) {
    return {
      serviceable: false,
      reason: 'Shipping is temporarily paused by FINZO EXOTIC WORLD. Please choose Shop Pickup if enabled.',
      mode: requestedMode,
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  // Check product-level delivery availability
  const blockedProduct = items.find((item) => {
    if (item.itemType === 'custom_aquarium') return false;
    const prod = products.find((p) => p.id === item.productId);
    return prod && prod.deliveryAvailable === false;
  });

  if (blockedProduct) {
    return {
      serviceable: false,
      reason: `"${blockedProduct.name}" is marked In-Store Pickup only. Switch delivery mode to Shop Pickup.`,
      mode: requestedMode,
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  if (normalizedPin && config.blockedPinCodes.includes(normalizedPin)) {
    return {
      serviceable: false,
      reason: `Delivery is not available for PIN code ${normalizedPin}.`,
      mode: requestedMode,
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  if (
    config.serviceablePinCodes.length > 0 &&
    normalizedPin &&
    !config.serviceablePinCodes.some((p) => normalizedPin.startsWith(p.trim()))
  ) {
    return {
      serviceable: false,
      reason: `PIN code ${normalizedPin} is outside our currently configured courier PIN service zone.`,
      mode: requestedMode,
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  if (
    hasLiveFish &&
    normalizedPin &&
    config.liveFishRestrictedPinPrefixes.some(
      (prefix) => prefix.trim() && normalizedPin.startsWith(prefix.trim())
    )
  ) {
    return {
      serviceable: false,
      reason: `Live fish air/insulated transit is restricted for PIN prefix ${normalizedPin.slice(
        0,
        3
      )}.`,
      mode: requestedMode,
      baseDeliveryCharge: 0,
      liveFishPackingCharge: 0,
      customAquariumDeliveryCharge: 0,
      totalDeliveryCharge: 0,
      freeDeliveryApplied: false,
    };
  }

  const isLocalZone =
    requestedMode === 'local' ||
    (normalizedPin !== '' &&
      config.localPinPrefixes.some(
        (prefix) => prefix.trim() && normalizedPin.startsWith(prefix.trim())
      )) ||
    (normalizedDistrict !== '' &&
      config.localDistricts.some(
        (d) => d.trim() && normalizedDistrict.includes(d.trim().toLowerCase())
      ));

  const effectiveMode: DeliveryMode = isLocalZone ? 'local' : 'standard';

  const freeDeliveryEligible =
    config.freeDeliveryThreshold > 0 && subtotalAfterDiscount >= config.freeDeliveryThreshold;

  const baseDeliveryCharge = freeDeliveryEligible
    ? 0
    : isLocalZone
    ? config.localDeliveryCharge
    : config.standardDeliveryCharge;

  const liveFishPackingCharge = hasLiveFish ? config.liveFishPackingCharge : 0;
  const customAquariumDeliveryCharge = hasCustomAquarium
    ? config.customAquariumDeliveryCharge
    : 0;

  const totalDeliveryCharge = Math.round(
    baseDeliveryCharge + liveFishPackingCharge + customAquariumDeliveryCharge
  );

  return {
    serviceable: true,
    mode: effectiveMode,
    baseDeliveryCharge,
    liveFishPackingCharge,
    customAquariumDeliveryCharge,
    totalDeliveryCharge,
    freeDeliveryApplied: freeDeliveryEligible,
  };
}
