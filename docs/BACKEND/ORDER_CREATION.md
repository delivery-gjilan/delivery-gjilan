# Order Creation

<!-- MDS:B2 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B1, B3, B6, BL1 -->
<!-- Depended-By: M4, BL3, O8 -->
<!-- Nav: Payment collection changes → update BL1 (Settlements), M4 (Mobile Audit). Preflight changes → update O8 (Testing). Pricing logic → update B3 (Validation). -->

This page documents the current backend order creation behavior in `api/src/services/OrderService.ts` and the current preflight checks that run before API startup.

## Core Flow

`createOrder(userId, input)` performs these steps:

1. Validate user exists and has `signupStep = COMPLETED`.
2. Load products and validate availability.
3. Validate selected options and offer child-item linking.
4. Recalculate item totals from DB snapshots (client price is not trusted).
5. Validate business restrictions:
   - max one restaurant per order
   - all involved businesses must be open now
6. Validate delivery fee using server-calculated pricing.
7. Apply promotions server-side (`PromotionEngine`).
8. Validate provided `totalPrice` against effective/allowed totals.
9. Persist order + top-level items in transaction.
10. Persist item options + child offer items.
11. Persist promotion usage and `order_promotions` rows.
12. Return mapped GraphQL `Order` including `paymentCollection`.

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
