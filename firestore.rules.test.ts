/**
 * Phase 0 Dirty Dozen Security Rule Verification Matrix
 * Documents expected PERMISSION_DENIED outcomes against firestore.rules.
 */

export interface SecurityTestCase {
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  reason: string;
}

export const DIRTY_DOZEN_SPECS: SecurityTestCase[] = [
  {
    name: '01. Shadow Admin Role Escalation',
    collection: 'customers/{uid}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidCustomer enforces keys().hasOnly without role or isAdmin.',
  },
  {
    name: '02. Unverified Admin Email Spoof',
    collection: 'products/{productId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isBootstrappedAdmin requires request.auth.token.email_verified == true.',
  },
  {
    name: '03. Cross-Customer Profile Read',
    collection: 'customers/{otherUid}',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Requires isOwner(customerId) || isAdmin().',
  },
  {
    name: '04. Blanket Order List Scraping',
    collection: 'orders',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'allow list requires resource.data.customerId == request.auth.uid or isBootstrappedAdmin().',
  },
  {
    name: '05. Non-Admin Product Price Tampering',
    collection: 'products/{productId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Product mutations strictly require isAdmin().',
  },
  {
    name: '06. Order Status Shortcutting on Create',
    collection: 'orders/{orderId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Order create requires incoming().status == "pending".',
  },
  {
    name: '07. Terminal Order State Mutation',
    collection: 'orders/{orderId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Customer can only cancel while existing().status == "pending".',
  },
  {
    name: '08. Orphan Wishlist Record',
    collection: 'wishlists/{wishlistId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Requires exists(/products/$(incoming().productId)).',
  },
  {
    name: '09. Path ID Poisoning',
    collection: 'orders/{invalidId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidId enforces regex ^[a-zA-Z0-9_\\-]+$ and length <= 200.',
  },
  {
    name: '10. Client Timestamp Forgery',
    collection: 'reviews/{reviewId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Requires createdAt == request.time and updatedAt == request.time.',
  },
  {
    name: '11. Unbounded Order Items Exhaustion',
    collection: 'orders/{orderId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidOrder enforces items.size() >= 1 && items.size() <= 30.',
  },
  {
    name: '12. Review Ghost Field Injection',
    collection: 'reviews/{reviewId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'affectedKeys().hasOnly(["rating", "comment", "updatedAt"]) rejects ghost fields.',
  },
];
