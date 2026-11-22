# FINZO EXOTIC WORLD — Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **Master Admin Isolation**: Only verified bootstrapped owner email (`luttappiluttu786@gmail.com`) or an explicit UID document inside `/admins/{uid}` grants admin privileges. Customers can never self-assign admin roles in `/customers/{uid}`.
2. **PII Isolation**: `/customers/{uid}`, `/addresses/{addressId}`, `/carts/{uid}`, and `/orders/{orderId}` are strictly readable only by the owning UID or an authenticated verified admin. No blanket `isSignedIn()` reads exist.
3. **Catalog, StoreSettings & Inventory Authority**: Only admins may create, modify, or delete `/products/{productId}`, `/categories/{categoryId}`, `/inventory/{productId}`, `/promotions/{promoId}`, and `/storeSettings/{settingId}`.
4. **Order Integrity & Terminal State Locking**: Customers can only create orders with `customerId == request.auth.uid`, `status == 'pending'`, server timestamps (`request.time`), and bounded line items (`1 <= items.size() <= 30`). Non-admins cannot alter order status beyond cancelling their own `pending` order; terminal states (`delivered`, `cancelled`) are locked against non-admin updates.
5. **Relational & Temporal Consistency**: Wishlists and reviews require `exists(/products/$(incoming().productId))` on create. All `createdAt` and `updatedAt` timestamps must equal `request.time`.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Admin Escalation**: Customer writes `{ "uid": "u1", "role": "admin", ... }` to `/customers/u1` (blocked by `keys().hasOnly(...)`).
2. **Unverified Email Spoof**: User with `email: "luttappiluttu786@gmail.com"` and `email_verified: false` attempts to write to `/products/p1` (blocked by `email_verified == true`).
3. **Cross-Customer PII Read**: User `u2` calls `get(/customers/u1)` or `get(/addresses/addr_u1)` (blocked by `customerId == request.auth.uid || isAdmin()`).
4. **Blanket List Query Scraping**: User `u2` runs `collection('orders').get()` without a `where('customerId', '==', 'u2')` filter (blocked by `resource.data.customerId == request.auth.uid` on `allow list`).
5. **Price Tampering on Order Create? / Product Tampering**: Customer attempts to update `price` on `/products/fish-royal-turquoise-discus` (blocked by `isAdmin()`).
6. **Status Shortcutting on Order**: Customer creates an order with `"status": "delivered"` instead of `"pending"` (blocked by `incoming().status == 'pending'`).
7. **Terminal State Mutate**: Customer attempts to update an order after it is `"delivered"` or `"cancelled"` (blocked by terminal state lock).
8. **Orphan Wishlist Injection**: Customer creates a wishlist item pointing to non-existent `productId: "ghost_999"` (blocked by `exists(/products/...)`).
9. **ID Poisoning**: Attacker attempts `setDoc(doc(db, 'orders', 'bad/../../id_over_128_chars...'))` (blocked by `isValidId()`).
10. **Client Timestamp Forgery**: Customer submits `"createdAt": "2020-01-01T00:00:00Z"` on review/order create (blocked by `incoming().createdAt == request.time`).
11. **Unbounded Array Resource Exhaustion**: Attacker submits an order with 500 line items (blocked by `data.items.size() <= 30`).
12. **Ghost Field Shadow Update on Review**: User updates their review and injects `"verifiedPurchase": true` or changes `"customerId"` (blocked by `affectedKeys().hasOnly(['rating', 'comment', 'updatedAt'])` and `customerId` immutability).
