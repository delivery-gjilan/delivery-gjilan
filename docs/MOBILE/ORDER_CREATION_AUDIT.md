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
