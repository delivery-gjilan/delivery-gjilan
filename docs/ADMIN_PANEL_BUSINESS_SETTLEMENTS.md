# Admin Panel Business Settlements

<!-- MDS:UI2 | Domain: UI | Updated: 2026-04-18 -->
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

### Page layout (top to bottom)

1. **Header** with refresh + "Request Settlement" button
2. **Period selector** — Today / This Week / This Month / All Time / Custom date range
3. **Summary cards** — Total, Pending, Paid Out, Net Earnings (uses `GET_SETTLEMENT_SUMMARY` + `GET_SETTLEMENT_BREAKDOWN` scoped to business + date range)
4. **Settlement requests** — Shows pending/accepted/rejected requests (collapsed when empty)
5. **Breakdown by category** — Lists each settlement category (PLATFORM_COMMISSION, DELIVERY_COMMISSION, PROMOTION_COST, etc.) with colored progress bars, percentage, count, and direction badge. Clicking a category filters the order table below via server-side `category` param on the settlements query.
6. **Settlement orders table** — Order-grouped table with filters for direction (You Owe / You Earn), status (Unsettled / Settled), and search. Clicking an order row opens the financial breakdown modal.

### Category breakdown

Uses the `GET_SETTLEMENT_BREAKDOWN` query with `type: BUSINESS, businessId, startDate, endDate`. Each row shows:
- Colored dot + label (from `CATEGORY_META` map)
- Direction badge ("You owe" / "You earn")
- Amount + percentage bar + settlement count
- Active state with chevron rotation when selected as filter

Clicking a category sets `categoryFilter` state, which is passed as the `category` variable to `GET_SETTLEMENTS_PAGE`. Clicking again deselects.

### Settlement orders table

Order-grouped flat table with columns:
- Order display ID
- Lines count
- You Owe (receivable total)
- You Earn (payable total)
- Net (payable - receivable)
- Status (settled/pending)
- Date

### Filters

- Period: date preset selector (top of page, shared with summary + breakdown)
- Direction: All / You Owe / You Earn (toggle group in table header)
- Status: All / Unsettled / Settled (toggle group in table header)
- Category: via breakdown card click (server-side filter)
- Search: by order ID (text input in table header)

### On-demand details

Order details lazy-fetched when user clicks a table row.

Implementation pattern:
- settlements list query returns minimal order fields for list rows
- details modal uses `GET_BUSINESS_ORDER_FINANCIALS` lazy query by order id
- Modal shows: order info, settlement lines with direction badges, and price breakdown (business price, markup, customer paid, owed amounts, net earnings)

## Access and Security

- Route `/dashboard/business-settlements` added to `businessUserAllowedPrefixes` in route-access.ts
- API resolvers scope business roles to their own business id
- BUSINESS_EMPLOYEE requires `view_finances` permission
- Order details resolver allows business access when either:
  - order currently contains that business items, or
  - a business settlement exists for that order and business
- If historical product ownership changed and the order cannot be mapped back to that business via current product ownership, API constructs a business-scoped fallback item list from order snapshots so modal breakdown still renders.

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
5. Period selector filters summary, breakdown, and order table together.
6. Clicking a breakdown category filters the order table to that category.
7. Clicking same category again clears the filter.
8. Clicking an order row fetches financials then renders modal.
9. Summary cards show correct totals for the selected period.
10. Net Earnings card shows signed value with correct color/icon.
