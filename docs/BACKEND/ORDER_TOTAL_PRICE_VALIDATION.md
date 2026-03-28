# Order Total Price Validation

<!-- MDS:B3 | Domain: Backend | Updated: 2025-07-21 -->
<!-- Depends-On: B2 -->
<!-- Depended-By: M4, M5, BL1 -->
<!-- Nav: Epsilon/rule changes → update M4 (Mobile Audit), M5 (Input Flow). Promo interaction → update BL1 (Settlements). -->

This document describes how `createOrder` validates client totals against server-calculated totals.

Source implementation:
- `api/src/services/OrderService.ts`

## Why Validation Exists

The backend is the source of truth for pricing. Client-provided totals are validated to prevent:

- tampered order totals
- stale prices
- inconsistent promotion application

## Inputs Involved

From `CreateOrderInput`:

- `items[]`
- `deliveryPrice`
- `totalPrice`
- `promoCode`

From backend calculation:

- `calculatedItemsTotal` (DB prices + selected option extras + child option extras)
- `expectedDeliveryPrice` (server-calculated from zones/tiers + dropoff)
- `promoResult.finalSubtotal`
- `promoResult.finalDeliveryPrice`
- `promoResult.finalTotal`

## Delivery Fee Validation (One-Directional)

Before promotions are applied, the backend validates `input.deliveryPrice` against
server delivery pricing rules:

- pricing anchor: first cart item's business (current single-fee order model)
- dropoff: `input.dropOffLocation`
- zone matching first (polygon)
- distance tiers fallback
- default fallback if no tiers exist

The check is **one-directional**: the client may send a value ≤ `expectedDeliveryPrice`
(e.g. `0` when a free-delivery promo has been pre-applied client-side), but
may not send a value **higher** than `expectedDeliveryPrice`.

If `input.deliveryPrice - expectedDeliveryPrice > 0.01`:

- reject with `Delivery price mismatch: Calculated X, provided Y`

**The promo engine always receives `expectedDeliveryPrice`** (server-authoritative),
not `input.deliveryPrice`, so promotion discounts are computed consistently
regardless of what the client sent.

The stored `originalDeliveryPrice` on the order (the pre-discount delivery fee) is
derived from `expectedDeliveryPrice`, not `input.deliveryPrice`.

## Validation Rules

Let:

- `effectiveTotal = promoResult.finalTotal` (computed from `expectedDeliveryPrice`, not `input.deliveryPrice`)
- `undiscountedTotal = calculatedItemsTotal + expectedDeliveryPrice`

The backend accepts the request if either condition below is true:

1. `input.totalPrice` matches `effectiveTotal` within epsilon `0.01`
2. No explicit `promoCode` was provided and `input.totalPrice` matches `undiscountedTotal` within epsilon `0.01`

If neither matches, the backend rejects with:

- `Price mismatch: Calculated X, provided Y`

## Why Rule #2 Exists

Some clients do not pre-apply server-side auto promotions (for example auto free-delivery or first-order auto rules) when building `totalPrice`.

In that case, client `totalPrice` can represent `items + delivery`, while server `effectiveTotal` may be lower after auto promotion application.

Rule #2 preserves safety while allowing this expected client behavior when `promoCode` is not explicitly supplied.

## Manual Promo Code Behavior

When `promoCode` is explicitly provided:

- only the effective server total is accepted
- fallback to undiscounted total is not allowed

This enforces strict consistency for manual promo submissions.

## Epsilon

Comparison epsilon is `0.01` to avoid floating-point noise.

## Practical Client Guidance

Clients should send:

- `deliveryPrice`: the raw delivery price returned by the backend delivery pricing
  endpoint (pre-promo). Values **lower** than expected (including `0` when a
  free-delivery promo was pre-applied) are also accepted. Values **higher** than
  expected are rejected.
- `totalPrice`: either effective final total (post-promo), or undiscounted total
  when no manual promo code is used.
