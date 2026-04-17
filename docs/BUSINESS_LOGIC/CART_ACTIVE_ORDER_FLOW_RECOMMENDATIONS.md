# Cart + Active Order Flow Analysis and Recommendations

<!-- MDS:BL3 | Domain: Business Logic | Updated: 2026-03-22 -->
<!-- Depends-On: B2, M4 -->
<!-- Depended-By: M1 -->
<!-- Nav: Checkout flow changes → update B2 (Order Creation), M4 (Mobile Audit). Payment collection → update BL1 (Settlements). Subscription changes → review A1 (Architecture). -->

Date: 2026-03-13
Scope: mobile-customer cart add/update/checkout flow, active-order tracking flow, floating banners behavior

## Current behavior snapshot

- API create-order enforces one active order per customer globally (any non-terminal status blocks a second order).
- API create-order enforces single-business per order; mixed-business payloads are rejected.
- In practical terms, a customer cannot keep one active business order and one active market order at the same time.
- Cart add-item validation only enforces one restaurant business in cart; non-restaurant items are not blocked at add-time by that rule.
- Because order submission is single-business + single-active-order enforced on API, server-side rules remain the final authority.

## 1) End-to-end flow: add to cart -> checkout -> active order banner

### A. Add/increment/decrement cart items

1. Product UI uses `CartControls` and `useProductInCart`.
2. `useProductInCart` reads current quantity from cart store and routes actions to `useCartActions`.
3. `addItem` in `cartActionsStore` enforces the single-restaurant rule (`validateMultiRestaurant`).
4. Cart state is persisted in AsyncStorage-backed Zustand (`cart-storage`).
5. `CartFloatingBar` listens to derived cart totals/count from `useCart` and appears when cart is non-empty.

Main files:
- `mobile-customer/modules/business/components/CartControls.tsx`
- `mobile-customer/modules/business/hooks/useProductInCart.tsx`
- `mobile-customer/modules/cart/store/cartActionsStore.ts`
- `mobile-customer/modules/cart/store/cartDataStore.ts`
- `mobile-customer/modules/cart/components/CartFloatingBar.tsx`

### B. Checkout / create order

1. `CartScreen` collects address, pricing, promo result, and notes.
2. `handleCheckout` calls `createOrder(...)` from `useCreateOrder`.
3. `useCreateOrder` currently blocks locally when `hasActiveOrders === true`.
4. Payload includes cart line price from client state.
5. On success, `CartScreen` clears cart, resets step, updates active order store, then shows success modal.
6. `SuccessModalContainer` immediately navigates to `/(tabs)/home` when the success phase starts (while the modal covers the screen), then auto-dismisses after 2.5 seconds. The `(tabs)` Stack.Screen has `animation: 'none'` so this navigation is instant with no slide/fade transition that would flash a black backdrop. By that time home and the active-order banner are fully rendered behind the modal — no black flash. User can still tap "Track Order" or "Go Home" manually before the timer fires.

Main files:
- `mobile-customer/modules/cart/components/CartScreen.tsx`
- `mobile-customer/modules/cart/hooks/useCreateOrder.ts`
- `mobile-customer/components/SuccessModalContainer.tsx`

### C. Active order tracking + floating banner

1. App root (`_layout`) invokes `useActiveOrdersTracking` globally.
2. `useOrders` loads orders from network and sets active orders in Zustand.
3. `useOrdersSubscription` is enabled only when authenticated and `hasActiveOrders` is true.
4. `OrdersFloatingBar` reads active orders store and currently displays only `activeOrders[0]`.
5. Pressing the bar fetches fresh order (`GET_ORDER`, network-only) before navigating to order details.

Main files:
- `mobile-customer/app/_layout.tsx`
- `mobile-customer/hooks/useActiveOrdersTracking.ts`
- `mobile-customer/modules/orders/hooks/useOrders.ts`
- `mobile-customer/modules/orders/hooks/useOrdersSubscription.ts`
- `mobile-customer/modules/orders/components/OrdersFloatingBar.tsx`
- `mobile-customer/components/FloatingBars.tsx`

## 2) Findings and risks

### High: subscription activation depends on current local `hasActiveOrders`

`useOrdersSubscription` uses:
- `shouldSubscribe = isAuthenticated && hasActiveOrders`
- `skip: !shouldSubscribe`

Impact:
- If a new order appears while local store still says no active orders (cross-device creation, stale store, or timing edge), subscription stays disabled and UI can lag until another refetch path runs.

Recommendation:
- Subscribe whenever authenticated user exists; filter/process events client-side instead of gating subscription by local active state.

### High: client-side active-order gate can reject valid checkouts or race with backend truth

`useCreateOrder` throws `Active order exists` based on local Zustand flag.

Impact:
- False positives: stale local `hasActiveOrders` blocks checkout.
- False negatives: local store says false but backend has active order; server rejects later.

Recommendation:
- Keep server as source of truth.
- Convert client-side gate to soft UX warning only, then submit and rely on API validation.
- On backend rejection, trigger deterministic sync (`refetch GET_ORDERS`, update store, show localized explanation).

### Medium: data model says multiple active orders, banner assumes one

`activeOrdersStore` supports array; `ActiveOrdersList` renders many.
`OrdersFloatingBar` comments and logic assume one and uses `activeOrders[0]`.

Impact:
- If multi-order is allowed/introduced, banner may surface the wrong order and create confusing navigation.

Recommendation:
- Explicit product decision:
  - If exactly one active order is allowed: enforce everywhere and store single `activeOrder` object.
  - If multiple active orders are allowed: banner should show count + nearest/most recent and navigate to active-orders list.

### Medium: client sends line-item price in create-order payload

`useCreateOrder` includes `price: item.price` from client cart.

Impact:
- If backend does not fully recalculate from canonical product data, this is a pricing integrity risk.

Recommendation:
- Ensure API always recalculates prices/promotions/delivery totals server-side and treats client price as advisory only.
- Return authoritative normalized order totals in mutation response.

### Medium: cart product refresh hook is a placeholder

`useCartProductDetails` was scaffolded as a placeholder but has since been removed. No cart reconciliation hook exists yet.

Impact:
- Cart may not react to product unavailability, disabled items, changed prices, or category updates before checkout.

Recommendation:
- Implement cart reconciliation query:
  - For each cart item: verify existence, availability, active status, and current price.
  - Surface per-item warnings and auto-fix options before submit.

### Low: floating bar hidden-route logic is static list

`FloatingBars` uses route prefix list for visibility.

Impact:
- Easy to miss new screens/routes and regress bar visibility behavior.

Recommendation:
- Move to route metadata or central route policy helper to avoid list drift.

## 3) Recommended refactor plan (incremental)

### Phase 1: consistency and race-hardening

1. Change order subscription lifecycle:
   - Subscribe when authenticated, not when `hasActiveOrders`.
2. In checkout, remove hard throw based solely on local flag; keep warning UX only.
3. After `createOrder` success/failure, always perform a targeted active-order sync.

### Phase 2: single vs multi active order contract

1. Decide product rule (single or multiple active orders).
2. Align store shape, banner UI, and order-list navigation to same rule.
3. Add invariant checks in dev mode to detect contract drift.

### Phase 3: cart data integrity

1. Implement `useCartProductDetails` with a real GraphQL query.
2. Add reconciliation pass when cart screen opens and before checkout submit.
3. Block submit for unavailable products and show actionable item-level messages.

### Phase 4: observability and tests

1. Add logs/metrics around:
   - create order attempts blocked by local state
   - backend rejections for active order conflicts
   - subscription reconnects and stale-order recovery
2. Add test scenarios:
   - cross-device order creation while app open
   - active order cancelled/delivered transitions
   - stale cart price/product availability changes

## 4) Quick wins you can ship first

1. Update `useOrdersSubscription` to subscribe when authenticated.
2. Keep active-order pre-check as non-blocking warning, not fatal throw.
3. Replace banner text "only support 1 active order" assumption with behavior aligned to store contract.
4. Implement minimal cart reconciliation for product existence + availability before `createOrder`.

## 5) Validation checklist

- Place order from device A while device B sits on home screen; banner should appear without manual refresh.
- Attempt checkout with stale local active-order flag; app should rely on backend response and self-heal store.
- Simulate product price change after item added to cart; checkout should show updated totals and clear explanation.
- With multiple active orders (if supported), banner/navigation should be deterministic and user-friendly.
