# Order Creation

<!-- MDS:B2 | Domain: Backend | Updated: 2026-05-28 -->
<!-- Depends-On: B1, B3, B6, BL1 -->
<!-- Depended-By: M4, BL3, O8 -->
<!-- Nav: Payment collection changes → update BL1 (Settlements), M4 (Mobile Audit). Preflight changes → update O8 (Testing). Pricing logic → update B3 (Validation). -->

This page documents the current backend order creation behavior and the preflight checks that run before API startup.

## File Layout

OrderService is split into a facade + domain modules under `api/src/services/order/`:

| File | Responsibility |
|------|----------------|
| `IOrderService.ts` | Public interface (33 methods) |
| `OrderService.ts` | Facade — delegates to modules, implements `IOrderService` |
| `OrderCreationModule.ts` | `createOrder`, pricing helpers, zone/tier resolution |
| `OrderQueryModule.ts` | All read/query methods (14 queries, ownership check) |
| `OrderLifecycleModule.ts` | Status transitions, approval, cancellation, analytics |
| `OrderMappingModule.ts` | DB → GraphQL order mapping (batched) |
| `OrderPublishingModule.ts` | PubSub subscription and publishing |
| `OrderUserBehaviorModule.ts` | User behavior tracking on order events |
| `types.ts` | Shared `OrderServiceDeps` type |
| `index.ts` | Barrel re-export |

A re-export shim at `api/src/services/OrderService.ts` preserves all existing import paths.

## Core Flow

`createOrder(userId, input)` performs these steps:

1. Validate user exists and has `signupStep = COMPLETED`.
2. Resolve service coverage using delivery zones and compute outside-zone flag.
3. Load products and validate availability.
4. Validate selected options and offer child-item linking.
5. Recalculate item totals from DB snapshots (client price is not trusted).
6. Validate business restrictions:
   - max one restaurant per order
   - all involved businesses must be open now
7. Validate delivery fee using server-calculated pricing.
8. Apply promotions server-side (`PromotionEngine`).
9. Validate provided `totalPrice` against effective/allowed totals.
10. **Determine approval requirement** (see below).
10a. **Inventory coverage** (when `inventoryModeEnabled`): query `personal_inventory` for `orderBusinessId`, compute `fromStock`/`fromMarket` per item, deduct `orderInventoryPrice` from `orderBasePrice`/`businessPrice`, populate `inventoryQuantity` per item and `inventoryPrice` on the order.
11. Persist order + top-level items in transaction (with `inventory_quantity` and `inventory_price` columns).
12. Persist item options + child offer items.
13. Persist promotion usage and `order_promotions` rows.
14. **Post-transaction** (non-fatal): write `order_coverage_logs` + deduct `personal_inventory` quantities. Failure here never blocks order creation; the DELIVERED-time handler acts as a safety net.
15. Return mapped GraphQL `Order` including `paymentCollection`.

## Read-Path Mapping

`OrderService` maps collection results through a shared batched loader instead of issuing the full supporting read set per order.

- list endpoints gather order items, item options, products, businesses, promotions, driver users, and first-order markers in grouped queries
- approval reasons are still derived from the same business rules (`FIRST_ORDER`, `OUT_OF_ZONE`, `HIGH_VALUE`)
- single-order reads still return the same GraphQL shape, but delegate to the same mapping path so response semantics stay aligned across list and detail queries

This keeps the response contract stable while reducing repeated database work on large order lists.

## Service Coverage and Location Flagging

Order creation does not hard-reject addresses outside configured service coverage.

- `OrderService.createOrder` computes `locationFlagged` when drop-off is outside service coverage.
- Service coverage resolution uses this priority:
   1. active zones where `isServiceZone = true` (supports multiple service zones)
   2. fallback to all active zones when no service zones are marked
- `Order.locationFlagged: Boolean!` is returned to admin clients.

This allows operations to review and manually handle edge deliveries while keeping the order in flow.

## Pre-Approval Flow (`AWAITING_APPROVAL`)

Certain orders land in `AWAITING_APPROVAL` status instead of `PENDING` and must be manually approved by an admin before the restaurant and driver flow starts.

**Triggers:**
- First-time order for the user (no previous orders in DB).
- Order total > €20.

**Lifecycle:**
```
AWAITING_APPROVAL  →  PENDING  →  PREPARING  →  READY  →  OUT_FOR_DELIVERY  →  DELIVERED
                   ↓
               CANCELLED
```

**Backend behavior:**
- `OrderService.createOrder` queries `orders.userId` with `LIMIT 1` to detect first order.
- `requiresApproval = isFirstOrder || totalOrderPrice > 20`
- Status is set to `AWAITING_APPROVAL` when `requiresApproval` is true.
- `Order.needsApproval: Boolean!` field returns `true` when status is `AWAITING_APPROVAL`.

**Notifications:**
- Both `notifyAdminsNewOrder` and `notifyAdminsOrderNeedsApproval` are sent.
- The approval notification has `timeSensitive: true`, `relevanceScore: 1.0`, title `"⚠ Order Needs Approval"`.
- Business new-order push is deferred for approval-required orders and sent only after admin approval.

**Admin approval:**
- `approveOrder(id: ID!): Order!` mutation (admin-only).
- Transitions `AWAITING_APPROVAL → PENDING` via `updateOrderStatus` (skip-validation mode).
- Publishes to `userOrdersUpdated` and `allOrdersUpdated` subscriptions.
- Sends business intake push (`notifyBusinessNewOrder`) after successful approval transition.
- Logged as `ORDER_STATUS_CHANGED` audit log with `{ from: 'AWAITING_APPROVAL', to: 'PENDING' }`.

**Admin UI:**
- Rose-colored badge "Needs approval" on order cards (table + map sidebar).
- Call-to-verify banner with customer phone number in expanded order card.
- "Approve" action on active order cards and "Approve Order" action in order detail panel.
- Map right-side order detail panel includes "Approve and Send to Business" action.
- `AWAITING_APPROVAL` included in `STATUS_COLORS` and `STATUS_LABELS` records.

## Delivery Zone Admin Configuration

Delivery zone management includes a dedicated service-zone toggle:

- Admin can set `isServiceZone` on create/edit in Delivery Zones.
- When a zone is marked as service zone, it is used for service-coverage checks.
- Delivery fee computation still follows active zone match first, then distance tiers fallback.

## Business Intake Visibility

Business-facing order list queries hide `AWAITING_APPROVAL` orders.


Result: business users receive and see orders only after admin approval transitions them to `PENDING`.

**Mobile customer:**
- Out-of-zone modal display is app-init only: mobile evaluates once after zone/order load and does not re-open during the same session when an order transitions to `DELIVERED`/`CANCELLED`.

## Business Status Authorization

- Business-owner/employee status transitions are guarded by business ownership checks (`orderContainsBusiness`).
- The ownership check returns a strict boolean from `order_items` + `products.businessId` matching, and denies status updates when the order is outside that business.
- Allowed business transitions remain:
   - `PENDING -> READY | CANCELLED`
   - `PREPARING -> READY | CANCELLED`

## Admin Mock Order Behavior

- `createTestOrder` inserts schema-aligned order snapshots (`businessId`, `basePrice`, `actualPrice`, `deliveryPrice`, etc.) so test orders are writable against the current orders table.
- Test order items persist `discountedPrice`/`finalAppliedPrice` snapshot fields used by current order item schema.



## Payment Collection Behavior

`CreateOrderInput.paymentCollection` is optional.

If omitted:
- backend defaults to `CASH_TO_DRIVER`.

If provided:
- backend persists provided value (`CASH_TO_DRIVER` or `PREPAID_TO_PLATFORM`).

This mode matters later for settlement behavior:
- automatic driver markup remittance applies only for `CASH_TO_DRIVER`.

## Price Validation Rules

Delivery fee validation is strict:
- `input.deliveryPrice` must match server pricing (zones/tiers) within epsilon.

Total validation:
- accepted if matches effective server total, or
- accepted if no explicit promo code and total matches undiscounted subtotal+delivery.

Rejected with clear errors when mismatched.

## Preflight Test Coverage

The full-suite preflight script is:

- `npm run test:api:preflight`

It currently runs a single consolidated suite script:

- `api/scripts/run-settlement-harness.ts`

That script now includes:

1. Settlement scenario harness checks (deterministic expected vs actual).
2. Order creation checks:
   - defaults payment collection to `CASH_TO_DRIVER`
   - honors explicit `PREPAID_TO_PLATFORM`
   - rejects mismatched delivery fee
   - rejects mismatched total
   - rejects invalid promo code

Output is human-readable with:
- `✓` pass lines
- `✗` fail lines
- mismatch details
- "look here" file pointers

## Known Gaps / Next Improvements

1. Preflight output can be noisy due promotion debug logs in dev logging profile.
2. The strict mode (`npm run test:api:strict`) currently fails because of existing unrelated type issues outside order creation/settlements.
3. Mobile checkout currently does not expose a payment-collection selector, so backend defaults are often used.

---

## OrderLifecycleModule — Dispatch Notification Side-Effects

`OrderLifecycleModule.startPreparingWithSideEffects()` schedules an early dispatch push notification using a Redis key `dispatch:early:{orderId}`. The key is set to `'fired'` once the notification is sent, preventing duplicate dispatches.

**READY revert guard:** When an admin reverts an order from `READY` back to `PENDING` or `PREPARING`, the `dispatch:early:{orderId}` Redis key is cleared. This ensures the driver receives a fresh notification when the order becomes `READY` again — without the clear, the stale `'fired'` value would suppress re-notification.

**Re-entry guard:** `startPreparingWithSideEffects` also clears any stale `'fired'` key before scheduling a new dispatch timer, handling the case where an order cycles through `PREPARING` multiple times.
