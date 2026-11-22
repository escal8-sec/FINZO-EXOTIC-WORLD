export type RoutePath =
  | '/'
  | '/fish'
  | '/aquariums'
  | '/custom-aquarium'
  | '/about'
  | '/care'
  | '/contact'
  | '/cart'
  | '/account'
  | '/admin'
  | '/admin/login'
  | '/admin/dashboard'
  | `/product/${string}`;

export type ProductKind = 'fish' | 'aquarium';

export type FishCategory =
  | 'Betta Fish'
  | 'Guppy Fish'
  | 'Goldfish'
  | 'Arowana'
  | 'Flowerhorn'
  | 'Discus'
  | 'Angelfish'
  | 'Shoaling'
  | 'Exotic Fish';

export type AquariumCategory =
  | 'Aquarium Tanks'
  | 'Aquarium Filters'
  | 'Fish Food'
  | 'Aquarium Accessories'
  | 'Aquarium Plants'
  | 'Aquarium Decorations'
  | 'LED Lighting'
  | 'Rimless Tanks'
  | 'Filtration';

export type CustomAddonRole =
  | 'lighting'
  | 'filtration'
  | 'substrate'
  | 'plants'
  | 'rocks'
  | 'fish'
  | 'accessories'
  | 'stand';

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  note?: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  scientificName?: string;
  kind: ProductKind;
  category: FishCategory | AquariumCategory | string;
  originOrMaterial: string;
  highlightSpec: string;
  price: number;
  discountedPrice?: number;
  image: string;
  secondaryImages?: string[];
  badge?: 'Best Seller' | 'New Arrival' | 'Collector Grade' | 'Flagship' | string;
  availability: 'In Stock' | 'Quarantine Ready' | 'Made to Order' | 'Out of Stock';
  isAvailable?: boolean;
  deliveryAvailable?: boolean;
  customAquariumCompatible?: boolean;
  customAddonRole?: CustomAddonRole;
  shortDescription: string;
  description: string;
  variants: ProductVariant[];
  specs: ProductSpec[];
  careNotes?: string[];
  isDemo?: boolean;
}

export type TankShape = 'Standard Rimless' | 'Cube' | 'Peninsula' | 'Bowfront' | 'Tall Architectural';
export type GlassFinish = 'OptiClear Low-Iron' | 'Ultra-Clear Black Silicone' | 'Tinted Obsidian Back';
export type BackingColor = 'Clear Panorama' | 'Deep Ocean Navy' | 'Obsidian Black' | 'Frosted Mist';
export type StandMaterial = 'None (Tank Only)' | 'Matte Obsidian Cabinet' | 'Burmese Teak Hardwood' | 'Brushed Anodized Steel';
export type LightingPreset = 'None' | 'RGBW Full-Spectrum Pendant' | 'Marine Reef Actinics' | 'Warm Botanical Spot';
export type FiltrationPreset = 'None' | 'Internal Whisper Bio' | 'External Canister + 316L Lily Pipes' | 'Concealed Rear Sump';
export type SubstrateOption = 'None' | 'Japanese Aquasoil' | 'Silica River Sand' | 'Volcanic Dark Gravel';
export type PlantsLevel = 'None' | 'Minimalist Anubias & Moss' | 'Lush Nature Aquascape';
export type RockHardscape = 'None' | 'Seiryu Mountain Stone' | 'Ohko Dragon Stone' | 'Malaysian Driftwood';
export type LivestockStarter = 'None' | 'Cardinal Tetra Shoal (12)' | 'Galaxy Koi Betta Feature' | 'Royal Turquoise Discus Pair';
export type PlumbingKit = 'Standard Glass Lid & Leveling Mat' | 'Pro CO2 Diffuser + Heater + Lid Kit';

export interface CustomAquariumAddonItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  category: string;
  role?: CustomAddonRole;
  price: number;
  quantity: number;
  image: string;
  slug: string;
}

export interface CustomAquariumPriceBreakdown {
  baseTankPrice: number;
  customizationCharges: number;
  selectedAccessoriesCost: number;
  addonsTotal: number;
  aquariumTotalBeforeDelivery: number;
  liters: number;
}

export interface CustomAquariumSpec {
  buildName: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  liters: number;
  glassThicknessMm: number;
  shape: TankShape;
  glassFinish: GlassFinish;
  backingColor: BackingColor;
  stand: StandMaterial;
  lighting: LightingPreset;
  filtration: FiltrationPreset;
  substrate: SubstrateOption;
  plants: PlantsLevel;
  hardscape: RockHardscape;
  livestock: LivestockStarter;
  plumbingKit: PlumbingKit;
  addons: CustomAquariumAddonItem[];
  breakdown: CustomAquariumPriceBreakdown;
  notes?: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  category: string;
  kind?: ProductKind;
  price: number;
  quantity: number;
  image: string;
  slug: string;
  itemType?: 'product' | 'custom_aquarium';
  customAquarium?: CustomAquariumSpec;
}

export interface GalleryInstallation {
  id: string;
  title: string;
  collector: string;
  location: string;
  tankSpec: string;
  image: string;
  caption: string;
}

export interface CustomerProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  aquariumFocus: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  buildingName?: string;
  street: string;
  area?: string;
  district?: string;
  city: string;
  state: string;
  postalCode: string;
  pinCode?: string;
  country: string;
  phone: string;
  deliveryInstructions?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'acclimating'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending_confirmation' | 'cod_scheduled' | 'paid' | 'refunded';

export type DeliveryMode = 'standard' | 'local' | 'pickup';

export interface OrderRecord {
  id: string;
  orderNumber?: string;
  orderType?: 'standard' | 'custom_aquarium' | 'mixed';
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: CartItem[];
  customAquarium?: CustomAquariumSpec;
  shippingAddress: {
    label: string;
    recipientName: string;
    fullName?: string;
    mobile?: string;
    email?: string;
    buildingName?: string;
    street: string;
    area?: string;
    district?: string;
    city: string;
    state: string;
    postalCode: string;
    pinCode?: string;
    country: string;
    phone: string;
    deliveryInstructions?: string;
    lat?: number;
    lng?: number;
    placeId?: string;
    formattedAddress?: string;
  };
  promoCode?: string;
  subtotal?: number;
  deliveryCharge?: number;
  deliveryMode?: DeliveryMode;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  status: OrderStatus;
  fulfillmentNote?: string;
  whatsappStatus?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryRecord {
  productId: string;
  productName: string;
  stockCount: number;
  quarantineStatus: 'Cleared' | 'In Quarantine' | 'Made to Order';
  lowStockThreshold: number;
  updatedAt?: unknown;
}

export interface WishlistEntry {
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  createdAt?: unknown;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PromotionRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercent: number;
  minOrderAmount: number;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface CategoryRecord {
  id: string;
  name: string;
  kind: ProductKind;
  description: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface StoreBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaPath: string;
  isActive: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  label: string;
  description: string;
  isEnabled: boolean;
}

export interface DeliveryPricingConfig {
  freeDeliveryThreshold: number;
  standardDeliveryCharge: number;
  localDeliveryCharge: number;
  customAquariumDeliveryCharge: number;
  liveFishPackingCharge: number;
  pickupAvailable: boolean;
  pickupLabel: string;
  localPinPrefixes: string[];
  localDistricts: string[];
  serviceablePinCodes: string[];
  blockedPinCodes: string[];
  liveFishRestrictedPinPrefixes: string[];
  deliveryNotes: string;
}

export interface CustomAquariumPricingConfig {
  baseAssemblyFee: number;
  pricePerLiter: number;
  glassThicknessMultipliers: Record<string, number>;
  shapeFees: Record<string, number>;
  finishFees: Record<string, number>;
  backingFees: Record<string, number>;
  standFees: Record<string, number>;
  lightingFees: Record<string, number>;
  filtrationFees: Record<string, number>;
  substrateFees: Record<string, number>;
  plantsFees: Record<string, number>;
  hardscapeFees: Record<string, number>;
  livestockFees: Record<string, number>;
  plumbingFees: Record<string, number>;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  tagline: string;
  logoUrl: string;
  contactEmail: string;
  whatsappNumber: string;
  instagramHandle: string;
  businessAddress: string;
  shippingAvailable: boolean;
  heroHeadline: string;
  heroSubtitle: string;
  banners: StoreBanner[];
  paymentMethods: PaymentMethodConfig[];
  deliveryConfig: DeliveryPricingConfig;
  customAquariumConfig: CustomAquariumPricingConfig;
  updatedAt?: unknown;
}
