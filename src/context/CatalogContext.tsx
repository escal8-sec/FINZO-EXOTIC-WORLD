import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeId, truncateText } from '../lib/firebase';
import { DEFAULT_STORE_SETTINGS, DEMO_CATEGORIES, DEMO_PRODUCTS } from '../data/catalog';
import {
  CategoryRecord,
  InventoryRecord,
  Product,
  ProductReview,
  PromotionRecord,
  StoreSettings,
} from '../types';

export interface ProductRatingSummary {
  average: number;
  count: number;
}

interface CatalogContextValue {
  products: Product[];
  allCategories: CategoryRecord[];
  activeCategories: CategoryRecord[];
  inventoryMap: Record<string, InventoryRecord>;
  promotions: PromotionRecord[];
  ratingMap: Record<string, ProductRatingSummary>;
  storeSettings: StoreSettings;
  catalogLoading: boolean;
  isUsingDemoFallback: boolean;
  seedDemoCatalog: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function mergeStoreSettings(remote?: Partial<StoreSettings> | null): StoreSettings {
  if (!remote) return DEFAULT_STORE_SETTINGS;
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...remote,
    banners: Array.isArray(remote.banners) && remote.banners.length > 0
      ? remote.banners
      : DEFAULT_STORE_SETTINGS.banners,
    paymentMethods:
      Array.isArray(remote.paymentMethods) && remote.paymentMethods.length > 0
        ? remote.paymentMethods
        : DEFAULT_STORE_SETTINGS.paymentMethods,
    deliveryConfig: {
      ...DEFAULT_STORE_SETTINGS.deliveryConfig,
      ...(remote.deliveryConfig ?? {}),
    },
    customAquariumConfig: {
      ...DEFAULT_STORE_SETTINGS.customAquariumConfig,
      ...(remote.customAquariumConfig ?? {}),
      glassThicknessMultipliers: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.glassThicknessMultipliers,
        ...(remote.customAquariumConfig?.glassThicknessMultipliers ?? {}),
      },
      shapeFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.shapeFees,
        ...(remote.customAquariumConfig?.shapeFees ?? {}),
      },
      finishFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.finishFees,
        ...(remote.customAquariumConfig?.finishFees ?? {}),
      },
      backingFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.backingFees,
        ...(remote.customAquariumConfig?.backingFees ?? {}),
      },
      standFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.standFees,
        ...(remote.customAquariumConfig?.standFees ?? {}),
      },
      lightingFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.lightingFees,
        ...(remote.customAquariumConfig?.lightingFees ?? {}),
      },
      filtrationFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.filtrationFees,
        ...(remote.customAquariumConfig?.filtrationFees ?? {}),
      },
      substrateFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.substrateFees,
        ...(remote.customAquariumConfig?.substrateFees ?? {}),
      },
      plantsFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.plantsFees,
        ...(remote.customAquariumConfig?.plantsFees ?? {}),
      },
      hardscapeFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.hardscapeFees,
        ...(remote.customAquariumConfig?.hardscapeFees ?? {}),
      },
      livestockFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.livestockFees,
        ...(remote.customAquariumConfig?.livestockFees ?? {}),
      },
      plumbingFees: {
        ...DEFAULT_STORE_SETTINGS.customAquariumConfig.plumbingFees,
        ...(remote.customAquariumConfig?.plumbingFees ?? {}),
      },
    },
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<CategoryRecord[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryRecord>>({});
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [remoteSettings, setRemoteSettings] = useState<Partial<StoreSettings> | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
        setFirestoreProducts(list);
        setCatalogLoading(false);
      },
      (error) => {
        setCatalogLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ ...(d.data() as CategoryRecord), id: d.id }))
          .sort((a, b) => a.displayOrder - b.displayOrder);
        setFirestoreCategories(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snap) => {
        const map: Record<string, InventoryRecord> = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data() as InventoryRecord;
        });
        setInventoryMap(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'inventory');
      }
    );

    const unsubPromos = onSnapshot(
      collection(db, 'promotions'),
      (snap) => {
        setPromotions(snap.docs.map((d) => ({ ...(d.data() as PromotionRecord), id: d.id })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'promotions');
      }
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ ...(d.data() as ProductReview), id: d.id })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'storeSettings', 'main'),
      (snap) => {
        if (snap.exists()) {
          setRemoteSettings(snap.data() as StoreSettings);
        } else {
          setRemoteSettings(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'storeSettings/main');
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
      unsubInventory();
      unsubPromos();
      unsubReviews();
      unsubSettings();
    };
  }, []);

  const isUsingDemoFallback = !catalogLoading && firestoreProducts.length === 0;

  const products = useMemo(() => {
    if (firestoreProducts.length > 0) {
      return firestoreProducts;
    }
    return DEMO_PRODUCTS.map((p) => ({ ...p, isDemo: true }));
  }, [firestoreProducts]);

  const allCategories = useMemo(() => {
    if (firestoreCategories.length > 0) {
      return firestoreCategories;
    }
    return DEMO_CATEGORIES;
  }, [firestoreCategories]);

  const activeCategories = useMemo(
    () => allCategories.filter((c) => c.isActive),
    [allCategories]
  );

  const ratingMap = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const rev of reviews) {
      if (!totals[rev.productId]) {
        totals[rev.productId] = { sum: 0, count: 0 };
      }
      totals[rev.productId].sum += rev.rating;
      totals[rev.productId].count += 1;
    }
    const result: Record<string, ProductRatingSummary> = {};
    for (const [productId, data] of Object.entries(totals)) {
      result[productId] = {
        average: Number((data.sum / data.count).toFixed(1)),
        count: data.count,
      };
    }
    return result;
  }, [reviews]);

  const storeSettings = useMemo(() => mergeStoreSettings(remoteSettings), [remoteSettings]);

  const seedDemoCatalog = useCallback(async () => {
    const batch = writeBatch(db);

    for (const item of DEMO_PRODUCTS) {
      const productId = sanitizeId(item.id);
      const productRef = doc(db, 'products', productId);
      const productPayload: Record<string, unknown> = {
        id: productId,
        slug: sanitizeId(item.slug),
        name: truncateText(item.name, 120),
        kind: item.kind,
        category: truncateText(item.category, 60),
        originOrMaterial: truncateText(item.originOrMaterial, 120),
        highlightSpec: truncateText(item.highlightSpec, 140),
        price: Number(item.price),
        image: truncateText(item.image, 2048),
        secondaryImages: (item.secondaryImages ?? [item.image]).slice(0, 6),
        availability: item.availability,
        isAvailable: item.isAvailable ?? true,
        deliveryAvailable: item.deliveryAvailable ?? true,
        customAquariumCompatible: Boolean(item.customAquariumCompatible),
        shortDescription: truncateText(item.shortDescription, 320),
        description: truncateText(item.description, 2500),
        variants: item.variants.slice(0, 8),
        specs: item.specs.slice(0, 12),
        careNotes: (item.careNotes ?? []).slice(0, 10),
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (typeof item.discountedPrice === 'number') {
        productPayload.discountedPrice = Number(item.discountedPrice);
      }
      if (item.customAddonRole) {
        productPayload.customAddonRole = truncateText(item.customAddonRole, 40);
      }
      if (item.scientificName) {
        productPayload.scientificName = truncateText(item.scientificName, 120);
      }
      if (item.badge) {
        productPayload.badge = truncateText(item.badge, 40);
      }
      batch.set(productRef, productPayload);

      const invRef = doc(db, 'inventory', productId);
      batch.set(invRef, {
        productId,
        productName: truncateText(item.name, 120),
        stockCount: item.kind === 'fish' ? 14 : 6,
        quarantineStatus:
          item.availability === 'Quarantine Ready'
            ? 'Cleared'
            : item.availability === 'Made to Order'
            ? 'Made to Order'
            : 'Cleared',
        lowStockThreshold: 3,
        updatedAt: serverTimestamp(),
      });
    }

    for (const cat of DEMO_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'promotions', 'promo-finzo10'), {
      id: 'promo-finzo10',
      code: 'FINZO10',
      title: 'Collector Welcome — 10% Privilege',
      description: 'Apply code FINZO10 on orders over ₹5,000.',
      discountPercent: 10,
      minOrderAmount: 5000,
      isActive: true,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'storeSettings', 'main'), {
      ...DEFAULT_STORE_SETTINGS,
      id: 'main',
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products/seedDemoCatalog');
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      allCategories,
      activeCategories,
      inventoryMap,
      promotions,
      ratingMap,
      storeSettings,
      catalogLoading,
      isUsingDemoFallback,
      seedDemoCatalog,
    }),
    [
      products,
      allCategories,
      activeCategories,
      inventoryMap,
      promotions,
      ratingMap,
      storeSettings,
      catalogLoading,
      isUsingDemoFallback,
      seedDemoCatalog,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
