# Direct Dispatch Commission One-Take Configuration

## Goal

Configure all direct-call delivery economics for a business in one edit flow:

- directDispatchEnabled
- directDispatchFixedAmount
- platform commission percent on that direct-call delivery fee

This configuration is isolated from normal platform-channel delivery rules and promotion delivery rules.

## Admin Flow

Business edit modals in admin panel expose three direct-dispatch controls:

- Direct Dispatch toggle
- Direct Dispatch Fixed Amount (EUR)
- Direct Dispatch Platform Commission (%)

On save:

1. Business settings are persisted through updateBusiness.
2. Admin panel synchronizes a settlement rule dedicated to direct dispatch commission.

Rule sync behavior:

- Rule marker: [DIRECT_DISPATCH_ONLY]
- Scope: BUSINESS
- Entity: DRIVER
- Type: DELIVERY_PRICE
- Direction: RECEIVABLE
- Amount type: PERCENT
- Amount: value from modal

If direct dispatch is disabled or commission is zero, the marked rule is set inactive.

## Settlement Engine Behavior

SettlementCalculationEngine interprets delivery rules with channel-aware logic:

- For DIRECT_DISPATCH orders:
  - If a business-scoped rule has [DIRECT_DISPATCH_ONLY] marker, only those marked delivery rules are applied.
- For non-direct-dispatch orders:
  - Marked [DIRECT_DISPATCH_ONLY] rules are ignored.
  - Existing normal rule precedence remains active (business+promotion > promotion > business > global).

This keeps direct-call commission from leaking into normal platform delivery flows.

## Why This Prevents Rule Mixing

Without channel isolation, a business delivery rule can affect both direct-dispatch and normal orders for that business.

The [DIRECT_DISPATCH_ONLY] marker + engine filter creates a dedicated rule lane for direct-call settlements, while existing promotion/platform rules continue to govern normal orders.

## Operational Notes

- Existing manual rules without the marker keep current behavior.
- The one-take modal path manages only the dedicated marked rule.
- Reporting and settlement reason text still identifies direct-call settlements as direct-call fixed payment related.

## Key Files

- admin-panel/src/components/businesses/EditBusinessModal.tsx
- admin-panel/src/components/businesses/EditBusinessDetailModal.tsx
- api/src/services/SettlementCalculationEngine.ts
