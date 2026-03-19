# Admin Panel Business Settlements

<!-- MDS:UI2 | Domain: UI | Updated: 2026-03-19 -->
<!-- Depends-On: BL1, UI1 -->
<!-- Depended-By: UI1 -->
<!-- Nav: Settlement semantics changes -> update BL1. Business settlements UX changes -> update UI1 and MDS_INDEX. -->

## Purpose

This document defines the business-facing settlements experience in admin-panel.

Route target: `/dashboard/business-settlements`

Audience:
- BUSINESS_OWNER
- BUSINESS_EMPLOYEE with `view_finances`

Goals:
- Keep settlements simple and filterable
- Show clear money-flow reasoning
- Avoid admin operation controls (settle/unsettle) on business-facing view
- Load heavy order details only on demand

## Semantics (Source Of Truth)

Settlement direction is from the platform perspective:

- `RECEIVABLE`: business owes platform (commission due)
- `PAYABLE`: platform owes business (payout due)

`amount` is always positive.

Business-side display formulas:

- `gross` = order subtotal for settlement context
- if direction is `RECEIVABLE`:
  - `commission` = settlement.amount
  - `net` = max(0, gross - commission)
- if direction is `PAYABLE`:
  - `net` = settlement.amount
  - `commission` = max(0, gross - net)

## UI Requirements

### List screen

Show a flat table (no grouped business dropdown/accordion) with:
- order id/display id
- timestamp
- gross
- direction
- commission
- net
- status
- reason
- action button: View order

### Filters

Keep filters visible at top:
- date range (all/today/this week/this month/from last settlement/custom)
- status
- direction
- order search

### On-demand details

Order details must be lazy-fetched only when user presses View order.

Implementation pattern:
- settlements list query returns minimal order fields for list rows
- details modal uses separate lazy query by order id

## Access and Security

- UI route allowed for business users via admin-panel route policy
- API resolvers scope business roles to their own business id
- BUSINESS_EMPLOYEE requires `view_finances` permission
- Order details resolver allows business access when either:
  - order currently contains that business items, or
  - a business settlement exists for that order and business

## Files

- `admin-panel/src/app/dashboard/business-settlements/page.tsx`
- `admin-panel/src/app/dashboard/finances/page.tsx` (legacy route redirect)
- `admin-panel/src/graphql/operations/settlements/queries.ts`
- `admin-panel/src/graphql/operations/orders/queries.ts`
- `admin-panel/src/lib/route-access.ts`
- `api/src/models/Settlement/resolvers/Query/settlements.ts`
- `api/src/models/Settlement/resolvers/Query/settlementSummary.ts`
- `docs/BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md`

## Validation checklist

1. Business owner sees only own-business settlements.
2. Business employee without `view_finances` is denied.
3. RECEIVABLE rows show commission due correctly.
4. PAYABLE rows show payout/net correctly.
5. No grouped business dropdown appears on list.
6. Clicking View order fetches details then renders modal.
7. Initial settlements list query payload does not include itemized order businesses/items.
