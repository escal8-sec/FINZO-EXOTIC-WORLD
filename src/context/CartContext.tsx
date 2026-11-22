import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, logFirestoreError, OperationType, sanitizeId } from '../lib/firebase';
import { getEffectiveProductPrice } from '../lib/currency';
import { ASSETS } from '../data/catalog';
import { useAuth } from './AuthContext';
import { CartItem, CustomAquariumSpec, Product, ProductVariant } from '../types';

interface CartContextValue {
  items: CartItem[];
  isDrawerOpen: boolean;
  totalItems: number;
  subtotal: number;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  addCustomAquarium: (spec: CustomAquariumSpec) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'finzo_exotic_world_cart_inr_v2';

const CartContext = createContext<CartContextValue | null>(null);

function mergeCartItems(localItems: CartItem[], remoteItems: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of remoteItems) {
    map.set(`${item.productId}::${item.variantId}`, item);
  }
  for (const item of localItems) {
    const key = `${item.productId}::${item.variantId}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
    } else {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).slice(0, 30);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const mergedUidRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const persistToFirestore = useCallback(
    async (nextItems: CartItem[]) => {
      if (!user || !user.emailVerified) return;
      const path = `carts/${user.uid}`;
      try {
        await setDoc(doc(db, 'carts', user.uid), {
          customerId: user.uid,
          items: nextItems.slice(0, 30),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        logFirestoreError(error, OperationType.WRITE, path);
      }
    },
    [user]
  );

  // Sync with Firestore carts/{uid} when signed in
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      mergedUidRef.current = null;
      return;
    }

    const path = `carts/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'carts', user.uid),
      (snap) => {
        const remoteItems: CartItem[] = snap.exists()
          ? ((snap.data().items as CartItem[]) ?? []).slice(0, 30)
          : [];

        if (mergedUidRef.current !== user.uid) {
          mergedUidRef.current = user.uid;
          const localItems = itemsRef.current;
          if (localItems.length > 0) {
            const combined = mergeCartItems(localItems, remoteItems);
            itemsRef.current = combined;
            setItems(combined);
            void persistToFirestore(combined);
            return;
          }
        }
        itemsRef.current = remoteItems;
        setItems(remoteItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsub();
  }, [authReady, user, persistToFirestore]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [items]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const commitItems = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      const next = updater(itemsRef.current).slice(0, 30);
      itemsRef.current = next;
      setItems(next);
      if (user) {
        void persistToFirestore(next);
      }
    },
    [user, persistToFirestore]
  );

  const addItem = useCallback(
    (product: Product, variant?: ProductVariant, quantity = 1) => {
      const safeQty = Math.max(1, Math.min(99, Math.round(quantity) || 1));
      const selectedVariant: ProductVariant = variant ??
        product.variants?.[0] ?? {
          id: `${product.id}-std`,
          label: product.kind === 'fish' ? 'Standard Specimen' : 'Standard Configuration',
          price: product.price,
        };
      const { currentPrice } = getEffectiveProductPrice(product, selectedVariant);
      commitItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.productId === product.id && item.variantId === selectedVariant.id
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            price: currentPrice,
            quantity: Math.min(99, updated[existingIndex].quantity + safeQty),
          };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            variantId: selectedVariant.id,
            variantLabel: selectedVariant.label,
            name: product.name,
            category: product.category,
            kind: product.kind,
            price: currentPrice,
            quantity: safeQty,
            image: product.image,
            slug: product.slug,
            itemType: 'product',
          },
        ];
      });
      setIsDrawerOpen(true);
    },
    [commitItems]
  );

  const addCustomAquarium = useCallback(
    (spec: CustomAquariumSpec) => {
      const buildId = sanitizeId(`custom_tank_${Date.now()}`, 80);
      commitItems((prev) => [
        ...prev,
        {
          productId: buildId,
          variantId: 'custom-spec',
          variantLabel: `${spec.lengthCm}×${spec.widthCm}×${spec.heightCm} cm · ${spec.liters}L · ${spec.glassThicknessMm}mm ${spec.shape}`,
          name: spec.buildName || 'Bespoke Custom Aquarium',
          category: 'Custom Aquarium Build',
          kind: 'aquarium',
          price: spec.breakdown.aquariumTotalBeforeDelivery,
          quantity: 1,
          image: ASSETS.rimlessTank,
          slug: 'custom-aquarium',
          itemType: 'custom_aquarium',
          customAquarium: spec,
        },
      ]);
      setIsDrawerOpen(true);
    },
    [commitItems]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string) => {
      commitItems((prev) =>
        prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
      );
    },
    [commitItems]
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      const safeQty = Math.round(quantity);
      if (!Number.isFinite(safeQty) || safeQty <= 0) {
        commitItems((prev) =>
          prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
        );
        return;
      }
      const clampedQty = Math.min(99, safeQty);
      commitItems((prev) =>
        prev.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: clampedQty }
            : item
        )
      );
    },
    [commitItems]
  );

  const clearCart = useCallback(() => {
    commitItems(() => []);
  }, [commitItems]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      isDrawerOpen,
      totalItems,
      subtotal,
      openDrawer,
      closeDrawer,
      addItem,
      addCustomAquarium,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      isDrawerOpen,
      totalItems,
      subtotal,
      openDrawer,
      closeDrawer,
      addItem,
      addCustomAquarium,
      removeItem,
      updateQuantity,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
