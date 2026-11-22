# Security Summary

A full codebase audit and remediation pass was completed across the Express backend (`server.ts`), Firebase security rules (`firestore.rules`, `storage.rules`), and React/TypeScript storefront, checkout, customer account, and admin modules.

## Reviewed Files

- `server.ts`
- `firestore.rules`
- `storage.rules`
- `src/lib/firebase.ts`
- `src/lib/whatsapp.ts`
- `src/context/CartContext.tsx`
- `src/context/WishlistContext.tsx`
- `src/context/AuthContext.tsx`
- `src/components/ResilientImage.tsx`
- `src/components/Navbar.tsx`
- `src/components/AddressLocationPicker.tsx`
- `src/components/ProductCard.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/AccountPage.tsx`
- `src/pages/ProductDetailsPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/AdminDashboardPage.tsx`

## Issues Resolved

| Area | Finding | Remediation Applied |
| :--- | :--- | :--- |
| Backend WhatsApp Relay (`server.ts`, `src/lib/whatsapp.ts`) | `POST /api/whatsapp/notify-order` accepted unauthenticated requests, allowed arbitrary `recipientNumber` routing, lacked rate limiting, and leaked upstream Graph API error payloads. | Added Firebase ID token verification via Google Identity Toolkit (`accounts:lookup`), enforced `emailVerified`, added a per-UID sliding-window rate limiter (5 requests / 60s), locked dispatch strictly to server-side `WHATSAPP_OWNER_NUMBER` (rejecting mismatched client numbers with HTTP 403), bounded `message` length (`10..4096`), redacted upstream error details, added security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), disabled `x-powered-by`, tightened JSON body limit (`256kb`), and added a JSON 404 fallback on `/api/*`. |
| Firestore Rules (`firestore.rules`) | Orders could be created with spoofed `paymentStatus` values (`paid` / `refunded`) or `discountAmount > subtotal`, and products could specify `discountedPrice >= price`. | Enforced `(!('paymentStatus' in incoming()) || incoming().paymentStatus in ['pending_confirmation', 'cod_scheduled'])` and `(!('subtotal' in incoming()) || incoming().discountAmount <= incoming().subtotal)` on `orders` creation, and `data.discountedPrice < data.price` in `isValidProduct`. Deployed via `DeployRules` after zero-warning `eslint` check. |
| Firebase Storage Rules (`storage.rules`) | `isAdminStorageUser()` queried `/databases/(default)/documents/admins/...` instead of the provisioned Firestore database ID, breaking delegated admin uploads and bypassing asset filename constraints. | Updated the Firestore cross-service path to `/databases/ai-studio-finzoexoticworld-3841ffcb-f6c9-4b98-a346-db12af01dfe7/documents/admins/$(request.auth.uid)` and enforced `isSafeAssetName(fileName)` (`^[a-zA-Z0-9_\\-\\.]{1,140}$`) across `products`, `categories`, and `branding`. |
| Checkout & Cart Integrity (`src/pages/CartPage.tsx`, `src/context/CartContext.tsx`) | Client `localStorage` cart prices could drift or be tampered with, stock checks were missing at checkout, `commitItems` mutated state inside React 19 StrictMode updaters, and `onSnapshot` merge closed over stale `items`. | Recomputed `authoritativeItems`, `subtotal`, and `customAquarium` pricing breakdowns from live Firestore `products` and `storeSettings.customAquariumConfig`; blocked checkout when `stockIssues` detect out-of-stock or insufficient `inventoryMap` quantity; synchronized `itemsRef` for pure state commits and merges; clamped quantities (`1..99`); and guarded missing `product.variants[0]`. |
| Asset URL Sanitization (`src/lib/firebase.ts`, `src/components/ResilientImage.tsx`, `src/components/Navbar.tsx`, `src/pages/AdminDashboardPage.tsx`) | Unvalidated `image`, `logoUrl`, and category image URLs could pass `javascript:` or unsafe `data:` schemes into `<img src>`. | Added `sanitizeAssetUrl()` permitting only `http://`, `https://`, and safe relative `/...` paths (rejecting `//` protocol-relative, `javascript:`, `vbscript:`, and `data:text/html`), applied at render boundaries and admin form inputs. |
| Auth, Permissions & Async Error Handling (`src/context/WishlistContext.tsx`, `src/context/AuthContext.tsx`, `src/pages/AccountPage.tsx`, `src/pages/ProductDetailsPage.tsx`, `src/pages/AdminDashboardPage.tsx`, `src/components/AddressLocationPicker.tsx`) | Unverified users could trigger permission-denied crashes, several async Firestore/Storage handlers lacked `try/catch`, product prices could break `discountedPrice < price`, and address phone/PIN fields lacked validation. | Added `user.emailVerified` checks prior to mutating wishlist/profile/checkout/reviews, replaced uncaught `handleFirestoreError` calls in interactive handlers with `logFirestoreError` + `formatFirestoreUserError` inline notices, added phone (`7–15` digits) and Indian PIN validation (`^[1-9][0-9]{5}$`) with `maxLength` bounds in `AddressLocationPicker`, ensured admin inline price edits keep `discountedPrice < price`, and reset `<input type="file">` after uploads. |

## Safeguards Verified

| Check | Scope | Result |
| :--- | :--- | :--- |
| Firestore Rules ESLint (`npx eslint firestore.rules`) | `firestore.rules` | Passed with 0 errors and 0 warnings |
| Rules Deployment (`DeployRules`) | Provisioned Firestore database | Succeeded cleanly |
| Dependency Security Posture | `package.json` lockfile audit | Two transitive advisories remain in `@grpc/grpc-js@1.9.16` under `@firebase/firestore-compat`; unreachable in browser WebChannel execution and left untouched to preserve SDK compatibility |

## PoC Verification

### 1. Unauthenticated / Third-Party WhatsApp Relay Blocked (`server.ts`)
- **Initial Risk**: Any unauthenticated caller could `POST /api/whatsapp/notify-order` with an arbitrary `recipientNumber` and trigger WhatsApp Cloud API messages from the server credentials.
- **Verification Trace**:
  1. Sending `POST /api/whatsapp/notify-order` without an `Authorization: Bearer <token>` header hits lines 106–115 of `server.ts` and returns HTTP `401` (`{ sent: false, error: 'Authentication required to dispatch order notifications.' }`).
  2. Sending an invalid token fails `verifyFirebaseIdToken` (lines 31–64, 117–125) with HTTP `401`; an unverified account token fails lines 126–133 with HTTP `403`.
  3. Supplying a `recipientNumber` whose digits differ from `process.env.WHATSAPP_OWNER_NUMBER` fails lines 183–193 with HTTP `403`, and outbound calls always target `to: ownerNumber` (line 206).
  4. Sending more than 5 requests within 60 seconds for the same UID triggers HTTP `429` at lines 135–146.

### 2. Order Payment Status & Discount Tampering Rejected (`firestore.rules`)
- **Initial Risk**: A verified customer could submit an `orders` document with `paymentStatus: 'paid'` or `discountAmount > subtotal` to bypass confirmation.
- **Verification Trace**:
  1. On `match /orders/{orderId}` (`allow create`, lines 441–448), `(!('paymentStatus' in incoming()) || incoming().paymentStatus in ['pending_confirmation', 'cod_scheduled'])` rejects `paid` or `refunded` on client creation.
  2. `(!('subtotal' in incoming()) || incoming().discountAmount <= incoming().subtotal)` prevents negative/exceeding discount spoofing.
  3. On `match /products/{productId}`, `isValidProduct` (line 74) enforces `data.discountedPrice < data.price`, preventing invalid discount displays.

### 3. Checkout Live Price & Stock Tampering Mitigated (`src/pages/CartPage.tsx`)
- **Initial Risk**: Tampering with `localStorage` cart JSON (`price: 1`) or submitting out-of-stock quantities could produce underpriced or unfulfillable orders.
- **Verification Trace**:
  1. `CartPage.tsx` (lines 121–203) maps every cart item against live `products` and `storeSettings.customAquariumConfig` to produce `authoritativeItems` and `subtotal` before promo, delivery, and total calculations.
  2. `inventoryMap` checks (lines 172–182) populate `stockIssues` when `isAvailable === false`, stock is `0`, or requested quantity exceeds `inv.stockCount`, disabling order submission and displaying the stock warning.

### 4. Storage Delegated Admin Lookup & Filename Guard (`storage.rules`)
- **Initial Risk**: Delegated admins registered in `/admins/{uid}` were checked against `(default)` instead of the active Firestore database ID, and arbitrary object names were accepted.
- **Verification Trace**:
  1. `isAdminStorageUser()` (`storage.rules`, lines 12–19) now checks `firestore.exists(/databases/ai-studio-finzoexoticworld-3841ffcb-f6c9-4b98-a346-db12af01dfe7/documents/admins/$(request.auth.uid))`.
  2. `isSafeAssetName(fileName)` (lines 8–10, applied at lines 24, 33, 42) restricts uploads to `[a-zA-Z0-9_-.]` within 140 characters and image MIME types `< 5 MB`.

### 5. Unsafe Asset URL Injection Blocked (`src/lib/firebase.ts`)
- **Initial Risk**: A crafted `javascript:` or `data:text/html` string saved or pasted into an image or logo field could propagate into UI elements.
- **Verification Trace**:
  1. `sanitizeAssetUrl` (`src/lib/firebase.ts`, lines 115–132) rejects protocol-relative URLs (`//...`) and any protocol other than `http:` / `https:` (or single-slash relative `/...` paths), returning `''`.
  2. Applied across `ResilientImage.tsx`, `Navbar.tsx` (`FinzoLogoMark`), and `AdminDashboardPage.tsx`.
