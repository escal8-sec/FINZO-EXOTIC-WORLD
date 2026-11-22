import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Check,
  ClipboardList,
  Database,
  Edit3,
  ExternalLink,
  FolderTree,
  ImagePlus,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  logFirestoreError,
  OperationType,
  sanitizeAssetUrl,
  sanitizeId,
  storage,
  truncateText,
} from '../lib/firebase';
import { formatINR } from '../lib/currency';
import { buildOrderWhatsAppMessage, buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { ASSETS } from '../data/catalog';
import {
  CategoryRecord,
  CustomAddonRole,
  OrderRecord,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductKind,
  ProductReview,
  StoreSettings,
} from '../types';
import { ResilientImage } from '../components/ResilientImage';
import { AdminLoginPage } from './AdminLoginPage';

type AdminTab =
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'reviews'
  | 'promos'
  | 'settings';

export function AdminDashboardPage() {
  const { user, authReady, isAdmin, adminRoleChecked, signOutUser } = useAuth();
  const {
    products,
    allCategories,
    inventoryMap,
    promotions,
    storeSettings,
    isUsingDemoFallback,
    seedDemoCatalog,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // ---------------- Products Form (Add / Edit) ----------------
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [kind, setKind] = useState<ProductKind>('fish');
  const [category, setCategory] = useState('Discus');
  const [originOrMaterial, setOriginOrMaterial] = useState('Amazon Basin Lineage');
  const [highlightSpec, setHighlightSpec] = useState('28–30°C · pH 6.2–6.8 · 200L+');
  const [badge, setBadge] = useState('New Arrival');
  const [price, setPrice] = useState('4500');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [stockCount, setStockCount] = useState('10');
  const [availability, setAvailability] = useState<
    'In Stock' | 'Quarantine Ready' | 'Made to Order' | 'Out of Stock'
  >('Quarantine Ready');
  const [isAvailable, setIsAvailable] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [customAquariumCompatible, setCustomAquariumCompatible] = useState(true);
  const [customAddonRole, setCustomAddonRole] = useState<CustomAddonRole>('fish');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [careNotesText, setCareNotesText] = useState(
    'Acclimate slowly before introducing into a cycled aquarium.'
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>([ASSETS.discus]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});

  // ---------------- Categories Form ----------------
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<ProductKind>('fish');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState('15');
  const [catImage, setCatImage] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [catUploadPct, setCatUploadPct] = useState<number | null>(null);

  // ---------------- Orders Filter ----------------
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'standard' | 'custom_aquarium' | 'mixed'>('all');

  // ---------------- Promotions ----------------
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [promoMin, setPromoMin] = useState('3000');

  // ---------------- Store Settings Draft ----------------
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(storeSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoUploadPct, setLogoUploadPct] = useState<number | null>(null);

  useEffect(() => {
    setSettingsDraft(storeSettings);
  }, [storeSettings]);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ ...(d.data() as OrderRecord), id: d.id })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );
    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ ...(d.data() as ProductReview), id: d.id })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'reviews')
    );
    return () => {
      unsubOrders();
      unsubReviews();
    };
  }, [authReady, user, isAdmin]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const matchesType = orderTypeFilter === 'all' || (o.orderType || 'standard') === orderTypeFilter;
      const matchesQuery =
        !q ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        (o.shippingAddress.pinCode || o.shippingAddress.postalCode || '')
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [orders, orderSearch, orderStatusFilter, orderTypeFilter]);

  if (!authReady || (user && !adminRoleChecked)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center text-slate-400 text-sm">
        Verifying administrator credentials...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLoginPage />;
  }

  const resetProductForm = () => {
    setEditingProductId(null);
    setName('');
    setScientificName('');
    setKind('fish');
    setCategory('Discus');
    setOriginOrMaterial('Amazon Basin Lineage');
    setHighlightSpec('28–30°C · pH 6.2–6.8 · 200L+');
    setBadge('New Arrival');
    setPrice('4500');
    setDiscountedPrice('');
    setStockCount('10');
    setAvailability('Quarantine Ready');
    setIsAvailable(true);
    setDeliveryAvailable(true);
    setCustomAquariumCompatible(true);
    setCustomAddonRole('fish');
    setShortDescription('');
    setDescription('');
    setCareNotesText('Acclimate slowly before introducing into a cycled aquarium.');
    setGalleryUrls([ASSETS.discus]);
    setManualImageUrl('');
  };

  const loadProductForEdit = (item: Product) => {
    setEditingProductId(item.id);
    setName(item.name);
    setScientificName(item.scientificName || '');
    setKind(item.kind);
    setCategory(item.category);
    setOriginOrMaterial(item.originOrMaterial);
    setHighlightSpec(item.highlightSpec);
    setBadge(item.badge || '');
    setPrice(String(item.price));
    setDiscountedPrice(
      typeof item.discountedPrice === 'number' ? String(item.discountedPrice) : ''
    );
    setStockCount(String(inventoryMap[item.id]?.stockCount ?? 10));
    setAvailability(item.availability);
    setIsAvailable(item.isAvailable !== false);
    setDeliveryAvailable(item.deliveryAvailable !== false);
    setCustomAquariumCompatible(Boolean(item.customAquariumCompatible));
    setCustomAddonRole(item.customAddonRole || (item.kind === 'fish' ? 'fish' : 'accessories'));
    setShortDescription(item.shortDescription);
    setDescription(item.description);
    setCareNotesText((item.careNotes || []).join('\n'));
    const imgs = item.secondaryImages?.length ? item.secondaryImages : [item.image];
    setGalleryUrls(Array.from(new Set([item.image, ...imgs])).slice(0, 6));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setAdminNotice(null);
    try {
      await seedDemoCatalog();
      setAdminNotice(
        'INR Demo Catalog, Categories, Inventory, FINZO10 promotion, and Store Settings synced to Firestore.'
      );
    } catch (error) {
      logFirestoreError(error, OperationType.WRITE, 'products');
      setAdminNotice(
        formatFirestoreUserError(error, 'Unable to seed demo catalog. Please try again.')
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleStorageUpload = (
    file: File,
    folder: 'products' | 'categories' | 'branding',
    filePrefix: string,
    onProgress: (pct: number | null) => void,
    onComplete: (url: string) => void
  ) => {
    if (!file.type.startsWith('image/')) {
      setAdminNotice('Please select a JPEG, PNG, WebP, or AVIF image file.');
      return;
    }
    if (file.size >= 5 * 1024 * 1024) {
      setAdminNotice('Image must be smaller than 5 MB.');
      return;
    }
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ext = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(rawExt) ? rawExt : 'jpg';
    const fileSlug = sanitizeId(filePrefix || 'asset', 60);
    const storageRef = ref(storage, `${folder}/${fileSlug}-${Date.now()}.${ext}`);
    const task = uploadBytesResumable(storageRef, file);

    onProgress(0);
    task.on(
      'state_changed',
      (snap) => {
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        onProgress(null);
        setAdminNotice(`Firebase Storage upload failed: ${err.message}`);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          onProgress(null);
          onComplete(url);
        } catch (err) {
          onProgress(null);
          setAdminNotice(
            `Unable to retrieve uploaded image URL: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
    );
  };

  const handleProductImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, 6 - galleryUrls.length));
    e.target.value = '';
    for (const file of files) {
      handleStorageUpload(file, 'products', name || 'product', setUploadProgress, (url) => {
        setGalleryUrls((prev) => Array.from(new Set([...prev, url])).slice(0, 6));
        setAdminNotice('Product photograph uploaded to Firebase Storage.');
      });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Math.max(0, Math.round(Number(price) || 0));
    const parsedDiscount = discountedPrice.trim() ? Math.round(Number(discountedPrice)) : NaN;
    const hasValidDiscount =
      !Number.isNaN(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount < numericPrice;
    const numericStock = Math.max(0, Math.round(Number(stockCount) || 0));

    const existingProd = editingProductId
      ? products.find((p) => p.id === editingProductId)
      : undefined;

    const productId = editingProductId
      ? sanitizeId(editingProductId, 128)
      : sanitizeId(`${kind}_${sanitizeId(name, 80)}_${Date.now()}`, 128);
    const slug = existingProd?.slug
      ? sanitizeId(existingProd.slug, 100)
      : sanitizeId(name, 100);

    const safeGallery = galleryUrls
      .map((u) => sanitizeAssetUrl(u))
      .filter(Boolean)
      .slice(0, 6);
    const primaryImg = safeGallery[0] || ASSETS.discus;
    const cleanGallery = (safeGallery.length > 0 ? safeGallery : [primaryImg]).map((u) =>
      truncateText(u, 2048)
    );
    const careList = careNotesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((s) => truncateText(s, 300));

    const nextVariants =
      existingProd && existingProd.variants.length > 0
        ? existingProd.variants.map((v, idx) =>
            idx === 0 ? { ...v, price: numericPrice } : v
          )
        : [
            {
              id: `${productId}-std`,
              label: kind === 'fish' ? 'Standard Specimen' : 'Standard Configuration',
              price: numericPrice,
            },
          ];

    setSavingProduct(true);
    setAdminNotice(null);

    const existingCreatedAt = (existingProd as unknown as { createdAt?: { seconds?: number } })?.createdAt;
    const hasFirestoreTimestamp =
      existingCreatedAt &&
      typeof existingCreatedAt === 'object' &&
      typeof existingCreatedAt.seconds === 'number';

    const productDoc: Record<string, unknown> = {
      id: productId,
      slug,
      name: truncateText(name, 120),
      kind,
      category: truncateText(category, 60),
      originOrMaterial: truncateText(originOrMaterial, 120),
      highlightSpec: truncateText(highlightSpec, 140),
      price: numericPrice,
      image: truncateText(primaryImg, 2048),
      secondaryImages: cleanGallery,
      availability: numericStock <= 0 ? 'Out of Stock' : availability,
      isAvailable,
      deliveryAvailable,
      customAquariumCompatible,
      customAddonRole,
      shortDescription: truncateText(
        shortDescription || `${name} curated by ${storeSettings.storeName}.`,
        320
      ),
      description: truncateText(
        description || shortDescription || `${name} hand-selected by ${storeSettings.storeName}.`,
        2500
      ),
      variants: nextVariants,
      specs:
        existingProd?.specs?.length
          ? existingProd.specs
          : [{ label: 'Specification', value: truncateText(highlightSpec, 120) }],
      careNotes: careList,
      isDemo: false,
      createdAt: !editingProductId || isUsingDemoFallback || !hasFirestoreTimestamp
        ? serverTimestamp()
        : existingCreatedAt,
      updatedAt: serverTimestamp(),
    };

    if (scientificName.trim()) {
      productDoc.scientificName = truncateText(scientificName, 120);
    }
    if (badge.trim()) {
      productDoc.badge = truncateText(badge, 40);
    }
    if (hasValidDiscount) {
      productDoc.discountedPrice = parsedDiscount;
    }

    try {
      await setDoc(doc(db, 'products', productId), productDoc);
      await setDoc(doc(db, 'inventory', productId), {
        productId,
        productName: truncateText(name, 120),
        stockCount: numericStock,
        quarantineStatus:
          availability === 'Quarantine Ready'
            ? 'Cleared'
            : availability === 'Made to Order'
            ? 'Made to Order'
            : 'Cleared',
        lowStockThreshold: inventoryMap[productId]?.lowStockThreshold ?? 3,
        updatedAt: serverTimestamp(),
      });
      setAdminNotice(
        editingProductId
          ? `Updated "${name}" across Firestore storefront.`
          : `Published "${name}" to Firestore catalog & inventory.`
      );
      resetProductForm();
    } catch (error) {
      logFirestoreError(
        error,
        editingProductId ? OperationType.UPDATE : OperationType.CREATE,
        `products/${productId}`
      );
      setAdminNotice(
        formatFirestoreUserError(error, `Unable to save "${name}". Check fields and retry.`)
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductFlag = async (
    item: Product,
    field: 'isAvailable' | 'deliveryAvailable' | 'customAquariumCompatible',
    nextVal: boolean
  ) => {
    try {
      await updateDoc(doc(db, 'products', item.id), {
        [field]: nextVal,
        updatedAt: serverTimestamp(),
      });
      setAdminNotice(`Updated ${field} for ${item.name}.`);
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `products/${item.id}`);
      setAdminNotice(formatFirestoreUserError(error, `Unable to update ${item.name}.`));
    }
  };

  const handleUpdateProductPrice = async (product: Product) => {
    const raw = Number(priceDrafts[product.id]);
    if (Number.isNaN(raw) || raw < 0) return;
    const nextPrice = Math.round(raw);
    const updatedVariants = product.variants.map((v, idx) =>
      idx === 0 ? { ...v, price: nextPrice } : v
    );
    const payload: Record<string, unknown> = {
      price: nextPrice,
      variants: updatedVariants,
      isDemo: false,
      updatedAt: serverTimestamp(),
    };
    // Ensure discountedPrice remains strictly below new price so security rules are satisfied
    if (
      typeof product.discountedPrice === 'number' &&
      product.discountedPrice >= nextPrice
    ) {
      payload.discountedPrice = Math.max(0, nextPrice - 1);
    }
    try {
      await updateDoc(doc(db, 'products', product.id), payload);
      setAdminNotice(`Updated price for ${product.name} to ${formatINR(nextPrice)}.`);
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
      setAdminNotice(
        formatFirestoreUserError(error, `Unable to update price for ${product.name}.`)
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      await deleteDoc(doc(db, 'inventory', productId));
      if (editingProductId === productId) resetProductForm();
      setAdminNotice('Product and inventory record removed.');
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to delete product.'));
    }
  };

  // ---------------- Categories Handlers ----------------
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const id = editingCategoryId || sanitizeId(`cat_${catName}`, 64);
    const safeCatImg = catImage.trim() ? sanitizeAssetUrl(catImage) : '';
    if (catImage.trim() && !safeCatImg) {
      setAdminNotice('Please enter a valid http(s) or relative category image URL.');
      return;
    }

    const payload: Record<string, unknown> = {
      id,
      name: truncateText(catName, 60),
      kind: catKind,
      description: truncateText(catDesc || `${catName} collection`, 240),
      displayOrder: Math.max(0, Math.min(1000, Math.round(Number(catOrder) || 1))),
      isActive: catActive,
      updatedAt: serverTimestamp(),
    };
    if (safeCatImg) {
      payload.image = truncateText(safeCatImg, 2048);
    }

    try {
      await setDoc(doc(db, 'categories', id), payload);
      setAdminNotice(`Category "${catName}" saved.`);
      setEditingCategoryId(null);
      setCatName('');
      setCatDesc('');
      setCatImage('');
      setCatActive(true);
    } catch (error) {
      logFirestoreError(error, OperationType.WRITE, `categories/${id}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to save category.'));
    }
  };

  const handleToggleCategory = async (cat: CategoryRecord) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), {
        isActive: !cat.isActive,
        updatedAt: serverTimestamp(),
      });
      setAdminNotice(`Category "${cat.name}" ${!cat.isActive ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `categories/${cat.id}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to update category status.'));
    }
  };

  const handleDeleteCategory = async (cat: CategoryRecord) => {
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      setAdminNotice(`Category "${cat.name}" deleted.`);
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to delete category.'));
    }
  };

  // ---------------- Inventory & Orders Handlers ----------------
  const handleUpdateStock = async (
    product: Product,
    nextStatus?: 'Cleared' | 'In Quarantine' | 'Made to Order'
  ) => {
    const current = inventoryMap[product.id];
    const nextCount =
      stockDrafts[product.id] !== undefined
        ? Math.max(0, Math.round(Number(stockDrafts[product.id]) || 0))
        : current?.stockCount ?? 0;

    try {
      await setDoc(doc(db, 'inventory', product.id), {
        productId: product.id,
        productName: truncateText(product.name, 120),
        stockCount: nextCount,
        quarantineStatus: nextStatus ?? current?.quarantineStatus ?? 'Cleared',
        lowStockThreshold: current?.lowStockThreshold ?? 3,
        updatedAt: serverTimestamp(),
      });
      setAdminNotice(`Inventory updated for ${product.name}.`);
    } catch (error) {
      logFirestoreError(error, OperationType.WRITE, `inventory/${product.id}`);
      setAdminNotice(formatFirestoreUserError(error, `Unable to update stock for ${product.name}.`));
    }
  };

  const handleUpdateOrder = async (
    orderId: string,
    updates: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      fulfillmentNote?: string;
    }
  ) => {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.status) payload.status = updates.status;
    if (updates.paymentStatus) payload.paymentStatus = updates.paymentStatus;
    if (updates.fulfillmentNote !== undefined) {
      payload.fulfillmentNote = truncateText(updates.fulfillmentNote, 500);
    }
    try {
      await updateDoc(doc(db, 'orders', orderId), payload);
      setAdminNotice(`Order #${orderId.slice(-6).toUpperCase()} updated.`);
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to update order right now.'));
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setAdminNotice('Review deleted.');
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to delete review.'));
    }
  };

  // ---------------- Promotions & Store Settings Handlers ----------------
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 2) {
      setAdminNotice('Promotion code must be at least 2 alphanumeric characters.');
      return;
    }
    const id = sanitizeId(`promo_${cleanCode}`, 64);
    try {
      await setDoc(doc(db, 'promotions', id), {
        id,
        code: cleanCode,
        title: truncateText(promoTitle || `${cleanCode} Privilege`, 120),
        description: truncateText(`Save ${promoDiscount}% on qualifying orders.`, 240),
        discountPercent: Math.min(90, Math.max(1, Number(promoDiscount) || 10)),
        minOrderAmount: Math.max(0, Number(promoMin) || 0),
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      setPromoCode('');
      setPromoTitle('');
      setAdminNotice(`Promotion ${cleanCode} saved.`);
    } catch (error) {
      logFirestoreError(error, OperationType.CREATE, `promotions/${id}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to publish promotion.'));
    }
  };

  const handleTogglePromo = async (promoId: string, currentlyActive: boolean) => {
    try {
      await updateDoc(doc(db, 'promotions', promoId), {
        isActive: !currentlyActive,
        updatedAt: serverTimestamp(),
      });
      setAdminNotice(`Promotion ${currentlyActive ? 'paused' : 'activated'}.`);
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `promotions/${promoId}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to update promotion status.'));
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    try {
      await deleteDoc(doc(db, 'promotions', promoId));
      setAdminNotice('Promotion deleted.');
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `promotions/${promoId}`);
      setAdminNotice(formatFirestoreUserError(error, 'Unable to delete promotion.'));
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setAdminNotice(null);
    const safeLogo = settingsDraft.logoUrl?.trim() ? sanitizeAssetUrl(settingsDraft.logoUrl) : '';
    if (settingsDraft.logoUrl?.trim() && !safeLogo) {
      setSavingSettings(false);
      setAdminNotice('Please enter a valid http(s) or relative Logo Image URL.');
      return;
    }

    const payload: Record<string, unknown> = {
      ...settingsDraft,
      id: 'main',
      storeName: truncateText(settingsDraft.storeName, 100),
      tagline: truncateText(settingsDraft.tagline, 160),
      logoUrl: truncateText(safeLogo, 2048),
      contactEmail: truncateText(settingsDraft.contactEmail, 160),
      whatsappNumber: truncateText(settingsDraft.whatsappNumber, 30),
      instagramHandle: truncateText(settingsDraft.instagramHandle, 80),
      businessAddress: truncateText(settingsDraft.businessAddress, 300),
      heroHeadline: truncateText(settingsDraft.heroHeadline, 160),
      heroSubtitle: truncateText(settingsDraft.heroSubtitle, 320),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'storeSettings', 'main'), payload);
      setAdminNotice('Store Settings, Delivery Rules & Custom Aquarium Pricing saved.');
    } catch (error) {
      logFirestoreError(error, OperationType.WRITE, 'storeSettings/main');
      setAdminNotice(formatFirestoreUserError(error, 'Unable to save store settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  const lowStockCount = Object.values(inventoryMap).filter(
    (inv) => inv.stockCount <= inv.lowStockThreshold
  ).length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  const categoryChoices = allCategories
    .filter((c) => c.kind === kind)
    .map((c) => c.name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-300">
            Owner Operations Console
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
            {storeSettings.storeName} Admin
          </h1>
          <p className="text-sm text-slate-400">
            Verified Administrator: {user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeedDemo()}
            className="px-4 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {seeding
              ? 'Syncing INR Catalog...'
              : isUsingDemoFallback
              ? 'Seed INR Demo Catalog'
              : 'Re-Sync Demo Defaults'}
          </button>

          <button
            type="button"
            onClick={() => void signOutUser()}
            className="px-4 py-2.5 rounded-xl border border-white/15 hover:border-white/35 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {adminNotice && (
        <div className="rounded-xl bg-cyan-400/12 border border-cyan-400/35 px-4 py-3 text-sm text-cyan-100 flex items-center justify-between gap-3">
          <span>{adminNotice}</span>
          <button type="button" onClick={() => setAdminNotice(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-slate-400">Catalog Products</span>
          <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
            {products.length}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-slate-400">Active Categories</span>
          <p className="font-mono text-2xl font-semibold text-cyan-200 tabular-nums mt-1">
            {allCategories.filter((c) => c.isActive).length} / {allCategories.length}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-slate-400">Pending Orders</span>
          <p className="font-mono text-2xl font-semibold text-amber-200 tabular-nums mt-1">
            {pendingOrdersCount} / {orders.length}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <span className="text-xs text-slate-400">Low Stock Alerts</span>
          <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* 7-Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'products', label: 'Products', icon: ImagePlus },
            { id: 'categories', label: 'Categories', icon: FolderTree },
            { id: 'inventory', label: 'Inventory', icon: Boxes },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ClipboardList },
            { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
            { id: 'promos', label: 'Promotions', icon: Tag },
            { id: 'settings', label: 'Store & Custom Tank Settings', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-cyan-400 text-[#040B16]'
                  : 'glass-panel text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCTS (FULL ADD + EDIT + MULTI-IMAGE + FLAGS) */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleSaveProduct} className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold text-white">
                {editingProductId ? 'Edit Product' : 'Add Product'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-amber-200 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={kind}
                onChange={(e) => {
                  const val = e.target.value as ProductKind;
                  setKind(val);
                  const firstCat = allCategories.find((c) => c.kind === val)?.name;
                  setCategory(firstCat || (val === 'fish' ? 'Discus' : 'Aquarium Tanks'));
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              >
                <option value="fish">Exotic Fish</option>
                <option value="aquarium">Aquarium / Accessory</option>
              </select>

              <select
                value={categoryChoices.includes(category) ? category : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') setCategory(e.target.value);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              >
                {categoryChoices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">Custom Category...</option>
              </select>
            </div>

            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Assigned Category Name"
              className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-slate-200"
            />

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product Name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="Scientific Name (optional)"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Badge (Best Seller, New Arrival)"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Price (₹)</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={discountedPrice}
                  onChange={(e) => setDiscountedPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Stock Qty</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={originOrMaterial}
                onChange={(e) => setOriginOrMaterial(e.target.value)}
                placeholder="Origin or Material"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as typeof availability)}
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              >
                <option value="Quarantine Ready">Quarantine Ready</option>
                <option value="In Stock">In Stock</option>
                <option value="Made to Order">Made to Order</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <input
              type="text"
              required
              value={highlightSpec}
              onChange={(e) => setHighlightSpec(e.target.value)}
              placeholder="Specs Summary (e.g. 28–30°C · pH 6.2 · 200L+)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
            />

            <textarea
              rows={2}
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short card description..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full detailed description..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />

            <textarea
              rows={2}
              value={careNotesText}
              onChange={(e) => setCareNotesText(e.target.value)}
              placeholder="Care & husbandry notes (one per line)..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
            />

            {/* Boolean Flags & Custom Aquarium Role */}
            <div className="rounded-xl bg-[#040B16]/60 border border-white/10 p-3.5 space-y-2.5 text-xs">
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="accent-cyan-400"
                />
                Product Available in Storefront
              </label>
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliveryAvailable}
                  onChange={(e) => setDeliveryAvailable(e.target.checked)}
                  className="accent-cyan-400"
                />
                Delivery Available (uncheck for In-Gallery Pickup Only)
              </label>
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customAquariumCompatible}
                  onChange={(e) => setCustomAquariumCompatible(e.target.checked)}
                  className="accent-cyan-400"
                />
                Show as Add-On inside Custom Aquarium Builder
              </label>

              {customAquariumCompatible && (
                <select
                  value={customAddonRole}
                  onChange={(e) => setCustomAddonRole(e.target.value as CustomAddonRole)}
                  className="w-full px-3 py-2 rounded-lg bg-[#040B16] border border-white/10 text-xs text-cyan-200"
                >
                  <option value="fish">Add-on Role: Exotic Fish</option>
                  <option value="lighting">Add-on Role: LED Lighting</option>
                  <option value="filtration">Add-on Role: Filtration</option>
                  <option value="substrate">Add-on Role: Substrate</option>
                  <option value="plants">Add-on Role: Aquatic Plants</option>
                  <option value="rocks">Add-on Role: Hardscape / Rocks</option>
                  <option value="accessories">Add-on Role: Accessories</option>
                </select>
              )}
            </div>

            {/* Multi-Image Storage Gallery */}
            <div className="space-y-2.5 rounded-xl bg-[#040B16]/60 border border-white/10 p-4">
              <span className="text-xs font-medium text-slate-300 block">
                Product Photographs ({galleryUrls.length}/6) — Firebase Storage
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleProductImagesUpload}
                className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:text-cyan-200 file:font-semibold hover:file:bg-cyan-400/30 cursor-pointer"
              />
              {uploadProgress !== null && (
                <p className="font-mono text-xs text-cyan-300">Uploading: {uploadProgress}%</p>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#040B16] border border-white/10 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const safe = sanitizeAssetUrl(manualImageUrl);
                    if (!safe) {
                      setAdminNotice('Please enter a valid http(s) or relative image URL.');
                      return;
                    }
                    if (galleryUrls.length < 6) {
                      setGalleryUrls((p) => Array.from(new Set([...p, safe])));
                      setManualImageUrl('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {galleryUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative rounded-lg overflow-hidden border border-white/15 group">
                    <ResilientImage src={url} alt={`Gallery ${idx + 1}`} aspectClassName="aspect-[4/3]" />
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 p-1 rounded bg-black/70 text-rose-300 text-[10px] cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {editingProductId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {savingProduct
                ? 'Saving Product...'
                : editingProductId
                ? 'Save Product Changes'
                : 'Publish to Storefront'}
            </button>
          </form>

          {/* Existing Products Manager */}
          <div className="lg:col-span-7 space-y-3">
            {isUsingDemoFallback && (
              <div className="rounded-2xl bg-amber-400/10 border border-amber-300/25 p-4 text-xs text-amber-200">
                Showing local demo catalog. Click “Seed INR Demo Catalog” above first to persist editable live records into Cloud Firestore.
              </div>
            )}

            {products.map((item) => (
              <div key={item.id} className="glass-panel rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-full sm:w-24 rounded-xl overflow-hidden shrink-0">
                    <ResilientImage src={item.image} alt={item.name} aspectClassName="aspect-[4/3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">
                      {item.category} · {item.isDemo ? 'Demo' : 'Live'} ·{' '}
                      {item.isAvailable === false ? 'Hidden' : 'Visible'}
                    </p>
                    <h3 className="text-base font-semibold text-white truncate">{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                      <span className="font-mono text-cyan-200 tabular-nums">
                        {formatINR(item.discountedPrice ?? item.price)}
                      </span>
                      {typeof item.discountedPrice === 'number' &&
                        item.discountedPrice < item.price && (
                          <span className="font-mono text-slate-500 line-through">
                            {formatINR(item.price)}
                          </span>
                        )}
                      {item.customAquariumCompatible && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-400/15 text-cyan-200">
                          3D Add-On
                        </span>
                      )}
                      {item.deliveryAvailable === false && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/15 text-amber-200">
                          Pickup Only
                        </span>
                      )}
                    </div>
                  </div>

                  {!isUsingDemoFallback && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder={String(item.price)}
                        value={priceDrafts[item.id] ?? ''}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-[#040B16]/80 border border-white/10 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => void handleUpdateProductPrice(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400 text-cyan-200 hover:text-[#040B16] border border-cyan-400/30 text-xs font-semibold cursor-pointer"
                      >
                        Price
                      </button>
                      <button
                        type="button"
                        onClick={() => loadProductForEdit(item)}
                        className="p-2 rounded-lg border border-white/15 text-slate-200 hover:border-cyan-400 cursor-pointer"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(item.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!isUsingDemoFallback && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleProductFlag(item, 'isAvailable', item.isAvailable === false)
                      }
                      className="px-2.5 py-1 rounded bg-[#040B16] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {item.isAvailable === false ? 'Mark Available' : 'Mark Unavailable'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleProductFlag(
                          item,
                          'deliveryAvailable',
                          item.deliveryAvailable === false
                        )
                      }
                      className="px-2.5 py-1 rounded bg-[#040B16] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {item.deliveryAvailable === false ? 'Enable Delivery' : 'Set Pickup Only'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleProductFlag(
                          item,
                          'customAquariumCompatible',
                          !item.customAquariumCompatible
                        )
                      }
                      className="px-2.5 py-1 rounded bg-[#040B16] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {item.customAquariumCompatible
                        ? 'Remove from Custom Builder'
                        : 'Allow in Custom Builder'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: UNLIMITED CUSTOM CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleSaveCategory} className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-white">
                {editingCategoryId ? 'Edit Category' : 'Add Custom Category'}
              </h2>
              {editingCategoryId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCatName('');
                    setCatDesc('');
                    setCatImage('');
                  }}
                  className="text-xs text-amber-200 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category Name (e.g. Arowana, Flowerhorn, CO2 Kits)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={catKind}
                onChange={(e) => setCatKind(e.target.value as ProductKind)}
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              >
                <option value="fish">Exotic Fish Section</option>
                <option value="aquarium">Aquarium &amp; Supplies Section</option>
              </select>
              <input
                type="number"
                min="0"
                max="1000"
                value={catOrder}
                onChange={(e) => setCatOrder(e.target.value)}
                placeholder="Order (e.g. 15)"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
              />
            </div>

            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Category description..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />

            <div className="space-y-2 rounded-xl bg-[#040B16]/60 border border-white/10 p-3.5">
              <span className="text-xs text-slate-300 block">Category Image (Storage Upload)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) {
                    handleStorageUpload(f, 'categories', catName || 'cat', setCatUploadPct, (url) =>
                      setCatImage(url)
                    );
                  }
                }}
                className="block w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:text-cyan-200 cursor-pointer"
              />
              {catUploadPct !== null && (
                <p className="font-mono text-xs text-cyan-300">Uploading: {catUploadPct}%</p>
              )}
              <input
                type="text"
                value={catImage}
                onChange={(e) => setCatImage(e.target.value)}
                placeholder="Category Image URL"
                className="w-full px-3 py-1.5 rounded-lg bg-[#040B16] border border-white/10 text-xs text-slate-300"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={catActive}
                onChange={(e) => setCatActive(e.target.checked)}
                className="accent-cyan-400"
              />
              Enable Category in Navbar &amp; Storefront Filters
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer"
            >
              {editingCategoryId ? 'Save Category Changes' : 'Create Category'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {allCategories.map((cat) => (
              <div
                key={cat.id}
                className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {cat.image && (
                    <div className="w-16 rounded-lg overflow-hidden shrink-0">
                      <ResilientImage src={cat.image} alt={cat.name} aspectClassName="aspect-[4/3]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-cyan-300">
                      {cat.kind} · Order #{cat.displayOrder} · {cat.isActive ? 'Enabled' : 'Disabled'}
                    </p>
                    <h3 className="text-base font-semibold text-white truncate">{cat.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{cat.description}</p>
                  </div>
                </div>

                {!isUsingDemoFallback && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleToggleCategory(cat)}
                      className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-200 hover:border-cyan-400 cursor-pointer"
                    >
                      {cat.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(cat.id);
                        setCatName(cat.name);
                        setCatKind(cat.kind);
                        setCatDesc(cat.description);
                        setCatOrder(String(cat.displayOrder));
                        setCatImage(cat.image || '');
                        setCatActive(cat.isActive);
                      }}
                      className="p-2 rounded-lg border border-white/15 text-slate-300 hover:text-white cursor-pointer"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCategory(cat)}
                      className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {products.map((item) => {
            const inv = inventoryMap[item.id];
            const countVal = stockDrafts[item.id] ?? String(inv?.stockCount ?? 0);
            const isLow = (inv?.stockCount ?? 0) <= (inv?.lowStockThreshold ?? 3);
            return (
              <div key={item.id} className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{item.name}</h3>
                    {isLow && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {item.category} · Quarantine: {inv?.quarantineStatus ?? 'Not Synced'}
                  </p>
                </div>

                {!isUsingDemoFallback && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="number"
                      min="0"
                      value={countVal}
                      onChange={(e) =>
                        setStockDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-24 px-3 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-xs font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => void handleUpdateStock(item)}
                      className="px-3.5 py-2 rounded-lg bg-cyan-400 text-[#040B16] text-xs font-semibold cursor-pointer"
                    >
                      Update Stock
                    </button>
                    <select
                      value={inv?.quarantineStatus ?? 'Cleared'}
                      onChange={(e) =>
                        void handleUpdateStock(
                          item,
                          e.target.value as 'Cleared' | 'In Quarantine' | 'Made to Order'
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-xs text-white cursor-pointer"
                    >
                      <option value="Cleared">Cleared</option>
                      <option value="In Quarantine">In Quarantine</option>
                      <option value="Made to Order">Made to Order</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: ORDERS & FULFILLMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search Order ID, name, PIN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
              />
            </div>

            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as typeof orderStatusFilter)}
              className="px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="acclimating">Acclimating</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value as typeof orderTypeFilter)}
              className="px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
            >
              <option value="all">All Order Types</option>
              <option value="standard">Standard Catalog</option>
              <option value="custom_aquarium">Custom Aquarium Builds</option>
              <option value="mixed">Mixed Carts</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-sm text-slate-400">
              No matching customer orders found.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const addr = order.shippingAddress;
              const mapsPinUrl =
                typeof addr.lat === 'number' && typeof addr.lng === 'number'
                  ? `https://maps.google.com/?q=${addr.lat},${addr.lng}`
                  : null;
              const waMessage = buildOrderWhatsAppMessage(order);
              const waHref = buildWhatsAppDirectUrl(
                addr.mobile || addr.phone || storeSettings.whatsappNumber,
                waMessage
              );

              return (
                <div key={order.id} className="glass-panel rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-cyan-300 font-semibold">
                          {order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`}
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/10 text-slate-200">
                          {order.orderType || 'standard'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {order.customerName} ({order.customerEmail})
                      </h3>
                      <p className="text-xs text-slate-300">
                        {[addr.buildingName, addr.street, addr.area, addr.district || addr.city, addr.state, addr.pinCode || addr.postalCode, addr.country]
                          .filter(Boolean)
                          .join(', ')}{' '}
                        · Tel: {order.customerPhone || addr.mobile || addr.phone}
                      </p>
                      {addr.deliveryInstructions && (
                        <p className="text-xs text-amber-200/90">
                          Delivery Note: {addr.deliveryInstructions}
                        </p>
                      )}
                      {mapsPinUrl && (
                        <a
                          href={mapsPinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          Open Google Maps Pin ({addr.lat?.toFixed(4)}, {addr.lng?.toFixed(4)})
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xl font-semibold text-white tabular-nums mr-2">
                        {formatINR(order.totalAmount)}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          void handleUpdateOrder(order.id, {
                            status: e.target.value as OrderStatus,
                          })
                        }
                        className="px-3 py-2 rounded-lg bg-[#040B16]/90 border border-cyan-400/35 text-xs font-semibold text-white cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="acclimating">Acclimating</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <select
                        value={order.paymentStatus || 'pending_confirmation'}
                        onChange={(e) =>
                          void handleUpdateOrder(order.id, {
                            paymentStatus: e.target.value as PaymentStatus,
                          })
                        }
                        className="px-3 py-2 rounded-lg bg-[#040B16]/90 border border-amber-300/35 text-xs font-semibold text-amber-100 cursor-pointer"
                      >
                        <option value="pending_confirmation">Pay: Pending</option>
                        <option value="cod_scheduled">Pay: COD</option>
                        <option value="paid">Pay: Paid</option>
                        <option value="refunded">Pay: Refunded</option>
                      </select>

                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg bg-emerald-400/15 border border-emerald-400/35 text-emerald-200 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp Customer
                      </a>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    {order.items.map((it) => (
                      <div key={`${it.productId}-${it.variantId}`} className="flex justify-between">
                        <span>
                          {it.name} ({it.variantLabel}) × {it.quantity}
                        </span>
                        <span className="font-mono text-cyan-200">
                          {formatINR(it.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Custom Aquarium Detailed Spec Block */}
                  {order.customAquarium && (
                    <div className="rounded-xl bg-[#040B16]/75 border border-cyan-400/20 p-4 text-xs text-slate-300 space-y-1.5">
                      <p className="font-semibold text-cyan-300">
                        Custom Aquarium Specification: {order.customAquarium.lengthCm}×
                        {order.customAquarium.widthCm}×{order.customAquarium.heightCm} cm ·{' '}
                        {order.customAquarium.liters}L · {order.customAquarium.glassThicknessMm}mm{' '}
                        {order.customAquarium.glassFinish} ({order.customAquarium.shape})
                      </p>
                      <p>
                        Backing: {order.customAquarium.backingColor} | Stand:{' '}
                        {order.customAquarium.stand} | Lighting: {order.customAquarium.lighting}
                      </p>
                      <p>
                        Filtration: {order.customAquarium.filtration} | Substrate:{' '}
                        {order.customAquarium.substrate} | Hardscape:{' '}
                        {order.customAquarium.hardscape} | Plants: {order.customAquarium.plants}
                      </p>
                      <p>
                        Livestock: {order.customAquarium.livestock} | Kit:{' '}
                        {order.customAquarium.plumbingKit}
                      </p>
                      {order.customAquarium.addons.length > 0 && (
                        <p className="text-amber-200">
                          Add-On Store Products:{' '}
                          {order.customAquarium.addons
                            .map((a) => `${a.name} × ${a.quantity}`)
                            .join(', ')}
                        </p>
                      )}
                      {order.customAquarium.notes && (
                        <p className="text-slate-400">Build Notes: {order.customAquarium.notes}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={statusNotes[order.id] ?? order.fulfillmentNote ?? ''}
                      onChange={(e) =>
                        setStatusNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="Add specialist dispatch or quarantine note..."
                      className="flex-1 px-3.5 py-2 rounded-lg bg-[#040B16]/80 border border-white/10 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateOrder(order.id, {
                          fulfillmentNote: statusNotes[order.id] ?? order.fulfillmentNote ?? '',
                        })
                      }
                      className="px-4 py-2 rounded-lg border border-white/15 hover:border-cyan-400 text-xs font-semibold text-white cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 5: GENUINE REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 text-xs text-slate-300">
            Ratings across the storefront are calculated strictly from genuine verified customer reviews. Administrators may moderate or remove inappropriate reviews here, but cannot fabricate or alter customer star ratings.
          </div>
          {reviews.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-sm text-slate-400">
              No customer reviews submitted yet.
            </div>
          ) : (
            reviews.map((rev) => {
              const prod = products.find((p) => p.id === rev.productId);
              return (
                <div key={rev.id} className="glass-panel rounded-2xl p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-cyan-300">{prod?.name || rev.productId}</p>
                    <p className="text-sm font-semibold text-white">
                      {rev.authorName} · {rev.rating}/5 Stars
                    </p>
                    <p className="text-sm text-slate-300">{rev.comment}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteReview(rev.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                    aria-label="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 6: PROMOTIONS */}
      {activeTab === 'promos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleCreatePromo} className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">Create Promotion</h2>
            <input
              type="text"
              required
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. FINZO15)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono uppercase"
            />
            <input
              type="text"
              required
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              placeholder="Promotion Title"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                required
                min="1"
                max="90"
                value={promoDiscount}
                onChange={(e) => setPromoDiscount(e.target.value)}
                placeholder="Discount %"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
              />
              <input
                type="number"
                required
                min="0"
                value={promoMin}
                onChange={(e) => setPromoMin(e.target.value)}
                placeholder="Min Order (₹)"
                className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-400 text-[#040B16] text-xs font-semibold cursor-pointer"
            >
              Publish Promotion
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {promotions.map((promo) => (
              <div key={promo.id} className="glass-panel rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-sm font-semibold text-amber-200">
                    {promo.code}
                  </span>
                  <p className="text-sm text-white font-medium">{promo.title}</p>
                  <p className="text-xs text-slate-400">
                    {promo.discountPercent}% off · Min. {formatINR(promo.minOrderAmount)} ·{' '}
                    {promo.isActive ? 'Active' : 'Paused'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTogglePromo(promo.id, promo.isActive)}
                    className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-200 cursor-pointer"
                  >
                    {promo.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePromo(promo.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                    aria-label={`Delete promotion ${promo.code}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: STORE SETTINGS, DELIVERY RULES & CUSTOM TANK PRICING */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-6">
          {/* 1. Store Branding & Contact */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              Brand Identity, Logo &amp; Contact Channels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Store Name</span>
                <input
                  type="text"
                  required
                  value={settingsDraft.storeName}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, storeName: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Tagline</span>
                <input
                  type="text"
                  value={settingsDraft.tagline}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, tagline: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">WhatsApp Business Number</span>
                <input
                  type="text"
                  required
                  value={settingsDraft.whatsappNumber}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, whatsappNumber: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Instagram Handle</span>
                <input
                  type="text"
                  value={settingsDraft.instagramHandle}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, instagramHandle: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Contact Email</span>
                <input
                  type="email"
                  required
                  value={settingsDraft.contactEmail}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, contactEmail: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Business Gallery Address</span>
                <input
                  type="text"
                  required
                  value={settingsDraft.businessAddress}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, businessAddress: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 block">
                  Upload Custom Store Logo (Firebase Storage)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) {
                      handleStorageUpload(f, 'branding', 'finzo-logo', setLogoUploadPct, (url) =>
                        setSettingsDraft((s) => ({ ...s, logoUrl: url }))
                      );
                    }
                  }}
                  className="block w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:text-cyan-200 cursor-pointer"
                />
                {logoUploadPct !== null && (
                  <p className="text-xs text-cyan-300">Uploading Logo: {logoUploadPct}%</p>
                )}
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Logo Image URL (optional)</span>
                <input
                  type="text"
                  value={settingsDraft.logoUrl}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="Leave blank to use default FINZO vector emblem"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Homepage Hero Headline</span>
                <input
                  type="text"
                  value={settingsDraft.heroHeadline}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, heroHeadline: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Homepage Hero Subtitle</span>
                <input
                  type="text"
                  value={settingsDraft.heroSubtitle}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, heroSubtitle: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
                />
              </label>
            </div>
          </section>

          {/* 2. Delivery Charges, PIN Rules & Payment Toggles */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-white">
                Delivery Pricing, PIN Zones &amp; Payment Options
              </h2>
              <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.shippingAvailable}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, shippingAvailable: e.target.checked }))
                  }
                  className="accent-cyan-400"
                />
                Global Shipping Enabled
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  ['freeDeliveryThreshold', 'Free Over (₹)'],
                  ['standardDeliveryCharge', 'Standard (₹)'],
                  ['localDeliveryCharge', 'Local (₹)'],
                  ['customAquariumDeliveryCharge', 'Custom Tank (₹)'],
                  ['liveFishPackingCharge', 'Fish Box (₹)'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={settingsDraft.deliveryConfig[field]}
                    onChange={(e) =>
                      setSettingsDraft((s) => ({
                        ...s,
                        deliveryConfig: {
                          ...s.deliveryConfig,
                          [field]: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Local PIN Prefixes (comma separated)</span>
                <input
                  type="text"
                  value={settingsDraft.deliveryConfig.localPinPrefixes.join(', ')}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      deliveryConfig: {
                        ...s.deliveryConfig,
                        localPinPrefixes: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Local Districts (comma separated)</span>
                <input
                  type="text"
                  value={settingsDraft.deliveryConfig.localDistricts.join(', ')}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      deliveryConfig: {
                        ...s.deliveryConfig,
                        localDistricts: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Blocked PIN Codes (comma separated)</span>
                <input
                  type="text"
                  value={settingsDraft.deliveryConfig.blockedPinCodes.join(', ')}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      deliveryConfig: {
                        ...s.deliveryConfig,
                        blockedPinCodes: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  placeholder="Optional blocked PINs"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">
                  Live Fish Restricted PIN Prefixes (comma separated)
                </span>
                <input
                  type="text"
                  value={settingsDraft.deliveryConfig.liveFishRestrictedPinPrefixes.join(', ')}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      deliveryConfig: {
                        ...s.deliveryConfig,
                        liveFishRestrictedPinPrefixes: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  placeholder="Optional prefixes (e.g. 790, 194)"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-xs text-white font-mono"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {settingsDraft.paymentMethods.map((pm, idx) => (
                <div key={pm.id} className="rounded-xl bg-[#040B16]/60 border border-white/10 p-3 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={pm.isEnabled}
                    onChange={(e) =>
                      setSettingsDraft((s) => ({
                        ...s,
                        paymentMethods: s.paymentMethods.map((m, i) =>
                          i === idx ? { ...m, isEnabled: e.target.checked } : m
                        ),
                      }))
                    }
                    className="mt-1 accent-cyan-400"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{pm.label}</p>
                    <p className="text-[11px] text-slate-400">{pm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Custom Aquarium Base Pricing Matrix */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              Custom Aquarium Pricing Rules (₹)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Base Assembly Fee (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={settingsDraft.customAquariumConfig.baseAssemblyFee}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      customAquariumConfig: {
                        ...s.customAquariumConfig,
                        baseAssemblyFee: Math.max(0, Number(e.target.value) || 0),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Rate Per Liter (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={settingsDraft.customAquariumConfig.pricePerLiter}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      customAquariumConfig: {
                        ...s.customAquariumConfig,
                        pricePerLiter: Math.max(0, Number(e.target.value) || 0),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {(
                [
                  ['standFees', 'Stand Pricing'],
                  ['lightingFees', 'Lighting Pricing'],
                  ['filtrationFees', 'Filtration Pricing'],
                ] as const
              ).map(([groupKey, groupLabel]) => (
                <div key={groupKey} className="rounded-xl bg-[#040B16]/60 border border-white/10 p-3.5 space-y-2">
                  <span className="font-semibold text-cyan-300 block">{groupLabel}</span>
                  {Object.entries(settingsDraft.customAquariumConfig[groupKey]).map(([optKey, val]) => (
                    <label key={optKey} className="flex items-center justify-between gap-2">
                      <span className="text-slate-300 truncate">{optKey}</span>
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            customAquariumConfig: {
                              ...s.customAquariumConfig,
                              [groupKey]: {
                                ...s.customAquariumConfig[groupKey],
                                [optKey]: Math.max(0, Number(e.target.value) || 0),
                              },
                            },
                          }))
                        }
                        className="w-24 px-2 py-1 rounded bg-[#040B16] border border-white/10 text-right font-mono text-white"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? 'Saving Settings to Firestore...' : 'Save All Store Settings'}
          </button>
        </form>
      )}
    </div>
  );
}
