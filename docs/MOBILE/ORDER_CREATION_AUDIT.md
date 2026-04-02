# Mobile Customer Order Creation Audit

<!-- MDS:M4 | Domain: Mobile | Updated: 2026-03-19 -->
<!-- Depends-On: B2, B3, BL1 -->
<!-- Depended-By: BL3 -->
<!-- Nav: Payment collection UI changes → update BL1 (Settlements). Checkout flow → update BL3 (Cart Flow). Price validation → review B3 (Validation). -->

Scope reviewed:
- `mobile-customer/modules/cart/components/CartScreen.tsx`
- `mobile-customer/modules/cart/hooks/useCreateOrder.ts`
- `mobile-customer/graphql/operations/orders/mutations.ts`

## Recent Updates

1. 2026-03-19: Mobile-customer now computes product unit price with effective precedence `salePrice -> nightMarkedupPrice (night hours) -> markupPrice -> base price` when adding to cart.
2. 2026-03-19: Backend `OrderService` and `PricingService` now use the same precedence for server-side recalculation/validation, so client-visible pricing and persisted `finalAppliedPrice` stay aligned.
3. 2026-03-19: Mobile product presentation surfaces were further aligned to the same shared helper (`ProductDetails`, `MarketProductCard`) to reduce pricing drift across cart vs. UI.
4. 2026-03-19: Backend N+1 reductions applied: order open-hours validation now batches business-hours/business fetches, and pricing batch calculation now fetches all products in one query.
5. 2026-03-19: Admin Orders UI now receives `OrderItem.basePrice` snapshots and computes markup badge/details from `(unitPrice - basePrice) * quantity` instead of fallback subtotal math.
6. 2026-03-19: Admin Order Details totals now use `originalPrice` / `originalDeliveryPrice` when present and render explicit discount lines, preventing subtotal confusion on promo-discounted orders.
7. 2026-03-19: Admin wording updated to `Promotions` / `Delivery Promotion` and backend original-price snapshot persistence now uses `> 0.01` tolerance to avoid false discount indicators from floating precision.
8. 2026-03-19: Admin Order Details item price cells now fall back to `basePrice` when `unitPrice` is absent, and totals card colors were adjusted (Delivery in amber, Total in green) for clearer visual hierarchy.
9. 2026-03-19: Mobile active-order tracking now listens for WS reconnect events and force-refetches order queries to recover missed status transitions during temporary real-time disconnects.
10. 2026-03-19: Mobile `userOrdersUpdated` handling was reconstructed to be subscription-first (direct Apollo cache + Zustand active-order updates from payload), while network refetch remains only as a throttled fallback for reconnect/payload anomalies.
11. 2026-03-19: Cross-app subscription optimization sweep applied the same subscription-first cache update pattern to admin panel orders, mobile-admin orders/map orders, mobile-business orders, and mobile-driver orders feeds; refetch is now fallback-only in those paths.

## Current Behavior

1. Checkout computes and sends:
   - `items`
   - `dropOffLocation`
   - `deliveryPrice`
   - `totalPrice`
   - `promoCode`
   - `driverNotes`
2. Delivery fee is calculated from backend endpoint before placing order.
3. Promo validation is performed from mobile and then revalidated server-side.
4. Selected checkout address is validated against active delivery zones when zones are configured; out-of-zone addresses are blocked in cart flow with user-facing prompt.
5. Address-selection maps (cart address picker and out-of-zone sheet picker) visually de-emphasize outside area with a zone mask and outline the effective delivery zones.
6. Checkout confirm button stays disabled for out-of-zone selected addresses and only unlocks for in-zone addresses.
7. Home out-of-zone prompt is app-init only and session-suppressed after any active order has existed in the current app session.
8. Address-picker `Confirm Address` remains disabled until the centered pin is inside effective delivery zones, and cart picker selections are persisted in delivery-location state with `isOverridden=true` for both saved-address and newly picked map points.
9. Delivery-fee zone checks reconcile local polygon validation with backend zone response and ignore stale async responses, so prior checks cannot incorrectly keep a newly selected in-zone address in an out-of-zone state.
10. Cart address picker now resolves pin coordinates from map camera center on region settle (with payload fallback), and zone polygon checks treat boundary points as inside to avoid false out-of-zone locks near edges.
11. Cart checkout hydrates selected address from persisted delivery-location state before default saved-address fallback, so user-overridden pin coordinates remain the starting point when reopening cart/address picker.
12. Map-picker confirm actions (cart picker and out-of-zone sheet picker) stay disabled until reverse geocoding resolves the current centered pin location, preventing stale/previous address confirmations.
13. Cart picker geocoding starts only from region-settle flow (not touch-release) with settle debounce, and confirm button text switches to `Finding address...` until current-pin reverse geocoding resolves.
14. Out-of-zone sheet map picker mirrors the same settle-token geocoding model (map-center coordinates, debounce, abort stale runs), so reverse geocoding starts only after movement fully settles.
15. Both map pickers enforce an explicit map-motion lock (`isMapInMotion`) so confirm actions remain disabled through drag release and momentum/hover phases until settle + current-pin geocode completion.
16. Out-of-zone picker confirm additionally requires the centered pin to be inside effective delivery zones and requires geocoded coordinates to match the current pin coordinate before enabling.
17. Both map pickers also enforce an active touch-hold lock (`isTouchingMap`), so confirm remains disabled while finger is down and only becomes eligible after finger release plus full settle and current-pin geocode completion.
18. Touch-responder lock was removed from confirm gating due inconsistent native responder delivery in map views; confirm eligibility now relies on stable motion-state (`isMapInMotion`) plus current-pin geocode-complete and in-zone checks, which remain the source of truth.
19. To avoid sticky disable states on certain devices, confirm gating no longer blocks directly on `isMapInMotion`; eligibility is driven by reverse-geocoding completion + current-pin geocode coordinate match + in-zone validation.

## Confirmed Gaps

1. Payment collection is not sent from mobile create-order input.
   - `useCreateOrder` does not include `paymentCollection` in mutation input.
   - backend therefore defaults to `CASH_TO_DRIVER`.
2. No UI control exists in checkout for choosing payment mode.
3. Create-order mutation selection does not request `paymentCollection` back.
   - app cannot immediately verify persisted mode from response.
4. Item `price` is still sent from mobile input but backend recalculates from DB snapshots.
   - this is safe, but can confuse developers unless documented.

## Impact

1. Prepaid flows are not user-selectable in customer mobile checkout today.
2. Settlement behavior tied to payment collection mode (like markup remittance) may not align with intended user flow unless backend default is acceptable.

## Recommended Next Mobile Changes

1. Add payment method selector in checkout review step.
2. Map selected method to `CreateOrderInput.paymentCollection`.
3. Request `paymentCollection` in create-order mutation response and store/show it in order detail.
4. Keep sending delivery/total as advisory values, but show user when backend normalized values differ.

## Validation After Mobile Changes

After implementing payment mode selection, verify:

1. Cash checkout sends `CASH_TO_DRIVER` and backend persists it.
2. Prepaid checkout sends `PREPAID_TO_PLATFORM` and backend persists it.
3. Order detail displays payment collection mode correctly.
4. Settlement harness scenarios still pass for both cash and prepaid models.
