import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Shield,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
import { formatINR } from '../lib/currency';
import { buildOrderWhatsAppMessage, buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { CustomerAddress, OrderRecord } from '../types';
import { ResilientImage } from '../components/ResilientImage';
import {
  AddressLocationPicker,
  StructuredDeliveryAddress,
} from '../components/AddressLocationPicker';

export function AccountPage() {
  const {
    user,
    authReady,
    customerProfile,
    needsRegistration,
    isAdmin,
    signingIn,
    authError,
    signInWithGoogle,
    signOutUser,
    completeRegistration,
    updateCustomerProfile,
  } = useAuth();
  const { navigate } = useRouter();
  const { items: wishlistItems, removeWishlistItem, wishlistNotice } = useWishlist();
  const { products, storeSettings } = useCatalog();
  const { addItem } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regFocus, setRegFocus] = useState('Exotic Freshwater & Planted Aquascapes');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  useEffect(() => {
    if (customerProfile) {
      setRegName(customerProfile.displayName);
      setRegPhone(customerProfile.phone);
      setRegFocus(customerProfile.aquariumFocus);
    } else if (user) {
      setRegName(user.displayName || '');
    }
  }, [customerProfile, user]);

  useEffect(() => {
    if (!authReady || !user) {
      setOrders([]);
      setAddresses([]);
      return;
    }

    const qOrders = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsubOrders = onSnapshot(
      qOrders,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ ...(d.data() as OrderRecord), id: d.id })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    const qAddresses = query(collection(db, 'addresses'), where('customerId', '==', user.uid));
    const unsubAddrs = onSnapshot(
      qAddresses,
      (snap) => {
        setAddresses(snap.docs.map((d) => ({ ...(d.data() as CustomerAddress), id: d.id })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'addresses')
    );

    return () => {
      unsubOrders();
      unsubAddrs();
    };
  }, [authReady, user]);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    setAccountNotice(null);
    try {
      await completeRegistration({
        displayName: regName,
        phone: regPhone,
        aquariumFocus: regFocus,
      });
      setProfileMessage('Customer registration completed.');
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : 'Unable to save registration details. Please retry.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    setAccountNotice(null);
    try {
      await updateCustomerProfile({
        displayName: regName,
        phone: regPhone,
        aquariumFocus: regFocus,
      });
      setProfileMessage('Profile details updated.');
    } catch (err) {
      setProfileMessage(
        err instanceof Error ? err.message : 'Unable to update profile details. Please retry.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setAccountNotice(null);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      setAccountNotice(
        formatFirestoreUserError(error, 'Unable to cancel this order. Please contact store support.')
      );
    }
  };

  const handleCreateStructuredAddress = async (addr: StructuredDeliveryAddress) => {
    if (!user) return;
    setAccountNotice(null);
    const id = sanitizeId(`addr_${user.uid}_${Date.now()}`, 128);
    const payload: Record<string, unknown> = {
      id,
      customerId: user.uid,
      label: truncateText(addr.label || 'Home', 40),
      recipientName: truncateText(addr.fullName || regName || 'Recipient', 100),
      fullName: truncateText(addr.fullName || regName, 100),
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
      phone: truncateText(addr.mobile || regPhone || '0000000000', 30),
      deliveryInstructions: truncateText(addr.deliveryInstructions, 300),
      isDefault: addresses.length === 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof addr.lat === 'number' && typeof addr.lng === 'number') {
      payload.lat = addr.lat;
      payload.lng = addr.lng;
    }
    if (addr.placeId) payload.placeId = truncateText(addr.placeId, 200);
    if (addr.formattedAddress) payload.formattedAddress = truncateText(addr.formattedAddress, 300);

    try {
      await setDoc(doc(db, 'addresses', id), payload);
    } catch (error) {
      logFirestoreError(error, OperationType.CREATE, `addresses/${id}`);
      throw new Error(
        formatFirestoreUserError(error, 'Unable to save address right now. Please try again.')
      );
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setAccountNotice(null);
    try {
      await deleteDoc(doc(db, 'addresses', id));
    } catch (error) {
      logFirestoreError(error, OperationType.DELETE, `addresses/${id}`);
      setAccountNotice(
        formatFirestoreUserError(error, 'Unable to remove this address right now.')
      );
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-slate-400 text-sm">
        Connecting to {storeSettings.storeName} account services...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-cyan-400/12 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-200/90">
              Collector Access
            </p>
            <h1 className="font-display text-4xl font-semibold text-white">
              Sign In or Register
            </h1>
            <p className="text-sm text-slate-300/85 leading-relaxed">
              Authenticate securely with Google to register your collector profile, sync your shopping bag across devices, save wishlists, and track orders &amp; custom aquarium builds.
            </p>
          </div>

          {authError && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg p-3">
              {authError}
            </p>
          )}

          <button
            type="button"
            disabled={signingIn}
            onClick={() => void signInWithGoogle()}
            className="w-full py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="text-xs text-slate-400 hover:text-amber-200 transition-colors cursor-pointer"
          >
            Store Owner / Administrator? Sign in at /admin/login →
          </button>
        </div>
      </div>
    );
  }

  if (needsRegistration) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
              New Collector Onboarding
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              Complete Customer Registration
            </h1>
            <p className="text-sm text-slate-300/85">
              Signed in as <span className="text-white">{user.email}</span>. Save your contact and aquarium preferences to activate your account.
            </p>
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Full Name</span>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Phone / WhatsApp Number</span>
              <input
                type="tel"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Aquarium Focus</span>
              <input
                type="text"
                required
                value={regFocus}
                onChange={(e) => setRegFocus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
              />
            </label>

            {profileMessage && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg p-3">
                {profileMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? 'Saving Profile...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-10">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
            Collector Account
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">
            {customerProfile?.displayName || user.displayName || 'FINZO Collector'}
          </h1>
          <p className="text-sm text-slate-400">
            {user.email} · {customerProfile?.aquariumFocus}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2.5 rounded-xl bg-amber-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              Open Admin Dashboard
            </button>
          )}
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'orders', label: `Orders (${orders.length})`, icon: Package },
          { id: 'wishlist', label: `Wishlist (${wishlistItems.length})`, icon: Heart },
          { id: 'addresses', label: `Addresses (${addresses.length})`, icon: MapPin },
          { id: 'profile', label: 'Profile Settings', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {(accountNotice || wishlistNotice) && (
        <div className="rounded-xl bg-amber-400/10 border border-amber-300/30 px-4 py-3 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{accountNotice || wishlistNotice}</span>
          {accountNotice && (
            <button
              type="button"
              onClick={() => setAccountNotice(null)}
              className="underline cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <p className="text-lg font-medium text-white">No orders placed yet</p>
              <button
                type="button"
                onClick={() => navigate('/fish')}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 text-[#040B16] text-xs font-semibold cursor-pointer"
              >
                Explore Exotic Fish
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const addr = order.shippingAddress;
              const mapsPinUrl =
                typeof addr.lat === 'number' && typeof addr.lng === 'number'
                  ? `https://maps.google.com/?q=${addr.lat},${addr.lng}`
                  : null;
              const waHref = buildWhatsAppDirectUrl(
                storeSettings.whatsappNumber,
                buildOrderWhatsAppMessage(order)
              );

              return (
                <div key={order.id} className="glass-panel rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="font-mono text-xs text-cyan-300">
                        Order {order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`}
                      </span>
                      <p className="text-sm text-white font-medium mt-0.5">
                        Status: <span className="text-cyan-300 capitalize">{order.status}</span>
                        {order.paymentMethod && (
                          <span className="text-xs text-slate-400">
                            {' '}
                            · {order.paymentMethod} ({order.paymentStatus || 'pending'})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-lg font-semibold text-white tabular-nums">
                        {formatINR(order.totalAmount)}
                      </span>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-cyan-400/35 text-cyan-200 hover:bg-cyan-400/15 text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void handleCancelOrder(order.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-400/35 text-rose-300 hover:bg-rose-500/15 text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                    {order.items.map((it) => (
                      <div key={`${it.productId}-${it.variantId}`} className="flex justify-between gap-2">
                        <span>
                          {it.name} × {it.quantity}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatINR(it.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.customAquarium && (
                    <div className="rounded-xl bg-[#040B16]/70 border border-white/10 p-3 text-xs text-slate-300 space-y-1">
                      <p className="font-semibold text-cyan-200">
                        Custom Tank Specs: {order.customAquarium.lengthCm}×{order.customAquarium.widthCm}×{order.customAquarium.heightCm} cm ({order.customAquarium.liters}L · {order.customAquarium.glassThicknessMm}mm {order.customAquarium.shape})
                      </p>
                      <p>
                        {order.customAquarium.stand} · {order.customAquarium.lighting} · {order.customAquarium.filtration}
                      </p>
                      {order.customAquarium.addons.length > 0 && (
                        <p className="text-slate-400">
                          Add-ons: {order.customAquarium.addons.map((a) => `${a.name} × ${a.quantity}`).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-white/10">
                    <span>
                      Ship to: {[addr.buildingName, addr.street, addr.city, addr.pinCode || addr.postalCode].filter(Boolean).join(', ')}
                      {typeof order.deliveryCharge === 'number' && ` · Delivery (${order.deliveryMode || 'standard'}): ${formatINR(order.deliveryCharge)}`}
                    </span>
                    {mapsPinUrl && (
                      <a
                        href={mapsPinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
                      >
                        Map Pin
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {order.fulfillmentNote && (
                    <p className="text-xs text-amber-200/90 pt-2 border-t border-white/10">
                      Specialist Note: {order.fulfillmentNote}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Wishlist Tab */}
      {activeTab === 'wishlist' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.length === 0 ? (
            <div className="md:col-span-3 glass-panel rounded-2xl p-12 text-center text-sm text-slate-400">
              Your wishlist is empty. Tap the heart icon on any fish or aquarium to save it here.
            </div>
          ) : (
            wishlistItems.map((entry) => {
              const prod = products.find((p) => p.id === entry.productId);
              return (
                <div key={entry.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col">
                  <button
                    type="button"
                    onClick={() => navigate(`/product/${entry.productSlug}`)}
                    className="cursor-pointer block"
                  >
                    <ResilientImage
                      src={entry.productImage}
                      alt={entry.productName}
                      aspectClassName="aspect-[4/3]"
                    />
                  </button>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{entry.productName}</h3>
                      <p className="font-mono text-sm text-cyan-200 tabular-nums mt-1">
                        {formatINR(entry.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {prod && prod.isAvailable !== false && (
                        <button
                          type="button"
                          onClick={() => addItem(prod, prod.variants?.[0], 1)}
                          className="flex-1 py-2 px-3 rounded-lg bg-cyan-400 text-[#040B16] text-xs font-semibold cursor-pointer"
                        >
                          Move to Cart
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeWishlistItem(entry.id)}
                        className="p-2 rounded-lg border border-white/15 text-slate-400 hover:text-rose-300 cursor-pointer"
                        aria-label="Remove wishlist item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Addresses Tab with Google Maps Pin Picker */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            {addresses.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
                No saved addresses yet. Add your Indian delivery location &amp; PIN code using the map form.
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="glass-panel rounded-2xl p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">
                      {addr.label}
                    </span>
                    <p className="text-base font-medium text-white">
                      {addr.fullName || addr.recipientName}
                    </p>
                    <p className="text-sm text-slate-300">
                      {[addr.buildingName, addr.street, addr.area, addr.city, addr.state]
                        .filter(Boolean)
                        .join(', ')}{' '}
                      {addr.pinCode || addr.postalCode}, {addr.country}
                    </p>
                    <p className="text-xs text-slate-400">{addr.mobile || addr.phone}</p>
                    {typeof addr.lat === 'number' && typeof addr.lng === 'number' && (
                      <a
                        href={`https://maps.google.com/?q=${addr.lat},${addr.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-300 pt-1"
                      >
                        View Map Pin
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAddress(addr.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                    aria-label="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-white">
              Add New Delivery Location
            </h2>
            <AddressLocationPicker
              initialValue={{
                fullName: regName || user.displayName || '',
                mobile: regPhone,
                email: user.email || '',
              }}
              onSave={handleCreateStructuredAddress}
            />
          </div>
        </div>
      )}

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileUpdate} className="max-w-xl glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-white">Profile Details</h2>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-300">Display Name</span>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-300">Phone Number</span>
            <input
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-300">Aquarium Focus</span>
            <input
              type="text"
              value={regFocus}
              onChange={(e) => setRegFocus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
            />
          </label>
          {profileMessage && <p className="text-xs text-cyan-300">{profileMessage}</p>}
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
