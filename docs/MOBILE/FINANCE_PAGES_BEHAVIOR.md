# Finance Pages — Deep Behavior Reference

> Covers **mobile-driver** `app/(tabs)/earnings.tsx`, **mobile-driver** `app/(tabs)/orders.tsx`, **mobile-business** `app/(tabs)/finances.tsx`, and **mobile-business** `app/(tabs)/orders.tsx`.
> Read alongside `docs/BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md` for the engine details.

---

## Architecture: Tab Split

The financial section of each app is split into two tabs:

| App | Tab | Purpose |
|-----|-----|---------|
| Driver | **Earnings** | Settlement accounting: cash flow waterfall, deduction groups, settlement request handling |
| Driver | **Orders** | Delivered order history with period filter and per-order detail |
| Business | **Finances** | Settlement accounting: revenue waterfall, deduction/payout groups, settlement request handling |
| Business | **Orders** | Delivered order history with period filter and per-order detail |

The Orders tabs show order-level data (what was delivered, revenue, customer, address).  
The Earnings/Finances tabs show settlement-level data (deductions, payouts, current cycle debt).

---

## 1. Settlement System Fundamentals

### Direction semantics (always platform-perspective)

| `direction` | Meaning | Examples |
|-------------|---------|----------|
| `RECEIVABLE` | Platform expects to **receive** money from the entity | Driver markup remittance, business platform commission |
| `PAYABLE` | Platform **owes** money to the entity | Delivery commission paid to driver, catalog revenue paid to business |

This is the source of truth in the DB. Both the driver and business screens map these into human-readable "you owe" / "platform owes you" language.

### Settlement lifecycle

```
Order → DELIVERED
       │
       ▼
FinancialService.createOrderSettlements()
       │
       ├── SettlementCalculationEngine runs rules
       │
       └── Inserts settlement rows with isSettled = false (status = PENDING)

Admin runs settleWithBusiness / settleWithDriver
       │
       └── marks rows isSettled = true  →  status = PAID
```

`status` on the GraphQL type is **derived** from `isSettled`:
- `isSettled = false` → `PENDING`
- `isSettled = true` → `PAID`

There are no OVERDUE/DISPUTED status values stored in the DB; those are legacy schema enum members that are never set by any current code path.

### Settlement categories (computed, not stored)

Categories are inferred at query time by `SettlementRepository.buildCategoryCondition()` and mirrored client-side by `getLineCategory()`:

| Category | How identified | Typical direction |
|----------|---------------|-------------------|
| `AUTO_REMITTANCE` | null ruleId, no special reason prefix | RECEIVABLE (driver remits markup/priority) |
| `STOCK_REMITTANCE` | reason starts "Stock item" | RECEIVABLE |
| `DRIVER_TIP` | reason starts "Driver tip" | RECEIVABLE (driver holds then remits), or PAYABLE (platform forwards to driver) |
| `CATALOG_REVENUE` | reason starts "Catalog product" | RECEIVABLE |
| `DIRECT_CALL_FIXED_FEE` | reason starts "Direct call fixed payment" | PAYABLE (platform pays driver for Direct Call delivery) |
| `DELIVERY_COMMISSION` | ruleId → rule.type = DELIVERY_PRICE, no promotionId | RECEIVABLE or PAYABLE depending on rule direction |
| `PLATFORM_COMMISSION` | ruleId → rule.type = ORDER_PRICE, no promotionId | RECEIVABLE (business pays platform %) |
| `PROMOTION_COST` | ruleId → rule.promotionId set | RECEIVABLE or PAYABLE |

---

## 2. Driver Earnings Screen (`mobile-driver/app/(tabs)/earnings.tsx`)

### Queries

| Query | Variables | Purpose |
|-------|-----------|---------|
| `GET_DRIVER_CASH_SUMMARY` | startDate, endDate | Cash totals panel (cash collected, you owe platform, platform owes you, take-home) |
| `GET_SETTLEMENT_BREAKDOWN` | isSettled=false, startDate, endDate | Per-category unsettled breakdown chips |
| `GET_MY_SETTLEMENTS` | startDate, endDate, limit=10000 | Full settlement list (filtered to unsettled in UI) |
| `GET_MY_SETTLEMENT_REQUESTS` | status=PENDING, limit=20 | Pending admin settlement requests |

All queries use `fetchPolicy: 'network-only'`. The `GET_ORDERS` query was removed from earnings.tsx — order history is now in the Orders tab.

### Period selector

Five pills: **Today / This Week / This Month / Last Month / All Time**.  
`getPeriodDates(period)` returns `{ startDate, endDate }` as ISO strings computed via `date-fns` (no server timezone normalization — assumes local city time).  
All queries re-fire when period changes.

### Settlement list data flow

```
GET_MY_SETTLEMENTS (all, no status filter)
          │
          ▼
allSettlements   ←── paginated in-memory (page size 10 000)
          │
          ▼
unsettledSettlements = filter(isUnsettledStatus)
    isUnsettledStatus: status === PENDING | OVERDUE | DISPUTED
    In practice only PENDING is returned by the API.
          │
          ▼
settlementOrders = group by orderId
    Each group: { orderId, settlements[], totalReceivable, totalPayable, latestCreatedAt }
```

### Cash summary panel

Driven by `driverCashSummary`:

| Field | Description |
|-------|-------------|
| `cashCollected` | Total CASH_TO_DRIVER delivery fees + markup the driver physically collected |
| `youOwePlatform` | Sum of DRIVER/RECEIVABLE unsettled settlements (markup, stock, catalog) |
| `platformOwesYou` | Sum of DRIVER/PAYABLE unsettled settlements (delivery commission, tips) |
| `netSettlement` | `platformOwesYou - youOwePlatform` |
| `takeHome` | `cashCollected + netSettlement` — actual cash the driver keeps |

### Visible order list

Each entry in the scrollable list is either:

1. **Settlement group** — one or more unsettled settlement lines exist for the order. Shows:
   - Net amount (`totalPayable - totalReceivable`) with sign
   - "Commission" chip (RECEIVABLE total) and "Platform pays" chip (PAYABLE total)
   - Category badge tags

2. **Awaiting settlement row** — order is DELIVERED and in the driver's assigned history, but no settlement rows yet exist for it. Shows revenue as placeholder with "Awaiting settlement" status.

The list is a merged chronological sort of both types using `orderDate` (or `latestCreatedAt` fallback).

### Category breakdown

Six chips above the list (driven by `settlementBreakdown` with `isSettled=false`). Each chip shows:
- Category icon + label
- Total amount + count
- Color indicating direction (red = you owe platform, green = platform owes you)

Tapping a chip opens the **Category Drill Modal**.

### Category drill-down modal

1. `handleCategoryPress` fires `GET_MY_SETTLEMENTS(category, direction, startDate, endDate, limit=10000)` via `useLazyQuery`.
2. `categorySettlements` is derived directly from the lazy query's return data (not a separate state), so stale closure races can't occur.
3. `categoryOrders` memo groups results by order, keeping only rows where `isUnsettledStatus(status)` = true.
4. Tapping an order in the drill opens the **Order Detail Modal** with `highlightCategory` set to the drill category.
5. In the order detail, settlement lines matching `getLineCategory(line) === highlightCategory` get a colored left border.

### Settlement request flow

Admin can issue settlement requests (admin proposes to settle). The driver sees a card with:
- "Accept" → `RESPOND_TO_SETTLEMENT_REQUEST(action: ACCEPT)` → marks related settlements as paid
- "Reject" → opens a dispute text modal → `RESPOND_TO_SETTLEMENT_REQUEST(action: REJECT, reason: ...)`

After responding, all related queries refetch.

### Net earnings interpretation

On the cash panel, **takeHome** is the core number: the physical cash the driver ends up keeping after all obligations are netted against what they collected. It is computed server-side by `driverCashSummary` resolver.

---

## 3. Business Finances Screen (`mobile-business/app/(tabs)/finances.tsx`)

### Tabs

The screen has two top-level tabs:
- **Settlements** (default) — financial obligations
- **Statistics** — order KPIs, revenue chart, top products, reviews

### Settlements tab queries

| Query | Variables | Purpose |
|-------|-----------|---------|
| `GET_MY_BUSINESS_SETTLEMENTS` | businessId, startDate, endDate, limit=10000 | Full settlement list |
| `GET_MY_BUSINESS_SETTLEMENT_SUMMARY` | businessId, startDate, endDate | Aggregate totals (not currently displayed in the main view — used internally) |
| `GET_BUSINESS_SETTLEMENT_BREAKDOWN` | businessId, isSettled=false, startDate, endDate | Per-category unsettled breakdown cards |
| `GET_LAST_BUSINESS_PAID_SETTLEMENT` | businessId | Most recent paid settlement date (for "From Last Settlement" period chip) |
| `GET_MY_SETTLEMENT_REQUESTS` | businessId, status=PENDING, limit=20 | Pending admin settlement requests |
| `GET_BUSINESS_ORDERS` | — | All business orders (used for Stats tab and "awaiting settlement" fallback rows) |

### Period selector

Six options: **From Last Settlement / Today / This Week / This Month / Custom Range / All Time**.  
"From Last Settlement" is disabled until the API returns a paid settlement.  
"Custom Range" opens a bottom sheet with DD/MM/YYYY text inputs.

### Summary cards

Two cards at the top:

**Revenue card**  
Total gross order subtotal across all visible unsettled settlement groups + awaiting-settlement delivered orders. Computed as `Σ(orderGroup.totalGross)`. This is the face value of the orders, not accounting for platform fees.

**Owed / Due to you card**  
Net settlement obligation computed as:

```
netOwed = Σ(RECEIVABLE unsettled) - Σ(PAYABLE unsettled)
```

| `netOwed` | Label | Color | Meaning |
|-----------|-------|-------|---------|
| > 0 | "Owed" | Red | Business owes this amount to the platform (after deducting payouts) |
| < 0 | "Due to you" | Green | Platform owes business this amount |
| = 0 | "Owed" | Green | No outstanding balance |

RECEIVABLE = commissions and fees owed by the business to the platform (platform markup, platform commission on order value).  
PAYABLE = money the platform owes the business (catalog revenue, delivery commissions platform owes business, tips it forwards).

The card background and border color track the sign dynamically.

### Visible order list

Same dual-entry pattern as driver:

1. **Settlement group** — has active settlement lines. Shows revenue (totalGross), owed chips (-totalReceivable), payout chips (+totalPayable), net amount, category badges.
2. **Awaiting settlement row** — DELIVERED order with no settlement lines yet. Shows gross revenue, "Awaiting settlement" status.

### Category breakdown cards

Driven by `GET_BUSINESS_SETTLEMENT_BREAKDOWN(isSettled=false)`. Each card shows category icon, label, line count, and total. Direction determines color (same scheme as driver).

### Category drill-down modal

1. `handleCategoryPress` fires `GET_MY_BUSINESS_SETTLEMENTS(businessId, direction, category, startDate, endDate, limit=10000)`.
2. `categorySettlements` is derived from `categoryData?.settlements` (lazy query return tuple), not from an `onCompleted` state setter — this ensures the drill always reflects the latest response without stale closure issues.
3. `categoryOrders` memo groups drill results, keeping only unsettled rows (`isUnsettledStatus`).
4. Tapping a drill order:
   - If the order is already in the main `settlementOrders` list: open its existing group with `highlightCategory` set.
   - Otherwise: build a compatible group from the drill's settlement lines and open that.
5. The order detail modal highlights settlement lines whose `getLineCategory()` matches the drill category.

### Settlement request flow

Same as driver. Admin proposes a settlement amount, business can Accept or Reject (with reason). Accepting triggers a refetch of summary + settlements.

### Statistics tab

Entirely self-contained. Powered by `GET_BUSINESS_ORDERS` (60 s poll) + `GET_BUSINESS_ORDER_REVIEWS`. No settlement queries. Period filter is independent from the Settlements tab period.

KPIs: Total orders, delivered count, revenue, avg order value, cancel rate, star rating.  
Chart: Last 7 days revenue bar chart (client-computed from delivered orders).  
Top products: Ranked by units sold across the stats period.

---

## 4. Shared Patterns

### `isUnsettledStatus(status)`
```ts
status === 'PENDING' || status === 'OVERDUE' || status === 'DISPUTED'
```
In practice only `PENDING` is returned by the API; the other branches exist for forward compatibility.

### `getLineCategory(settlement)` — client mirrors `buildCategoryCondition`
Both sides must stay in sync. If a new category is added to the backend, add it to both `getLineCategory` and `getCategoryColor/getCategoryConfig` in each screen.

### Pull-to-refresh
All queries refetch in `Promise.all(...)`. On the business screen, refreshing while on the Stats tab only refetches orders/products/reviews; switching to Settlements tab doesn't auto-refresh — user must pull again after switching.

### Pagination
Both screens use `limit=10000` as a practical upper bound and track `offset` for `fetchMore`. "Load More" button appears when `hasMoreSettlements && settlementOrders.length > 0`. In real usage the page size ensures a single request covers all data.

---

## 5. Settlement Direction Worked Example

Order: €20 value, CASH_TO_DRIVER, €2 markup, €5 delivery fee, 10% platform commission rule.

| Settlement row | type | direction | amount | Category |
|---------------|------|-----------|--------|---------|
| Markup remittance | DRIVER | RECEIVABLE | €2.00 | AUTO_REMITTANCE |
| Platform commission | BUSINESS | RECEIVABLE | €2.00 | PLATFORM_COMMISSION |
| Delivery commission (driver) | DRIVER | PAYABLE | €1.50 | DELIVERY_COMMISSION |

**Driver view:**
- Cash summary: `cashCollected=€25` (delivery + markup), `youOwePlatform=€2`, `platformOwesYou=€1.50`, `netSettlement=−€0.50`, `takeHome=€24.50`.
- Earnings list: one group showing `Commission: €2.00` (RECEIVABLE), `Platform pays: €1.50` (PAYABLE), net = `+€1.50 − €2.00 = −€0.50`.

**Business view:**
- Owed card: `netOwed = €2.00 RECEIVABLE − €0 PAYABLE = €2.00` → "Owed €2.00" in red.
- Per-order chip: "Owed: −€2.00" (the commission deduction).

---

## 6. Known Limitations

- `paidAt`, `paymentReference`, `paymentMethod` are always `null` from the API (backward-compat fields, never stored).
- Settlement status is binary (`PENDING` / `PAID`). There is no partial settlement tracking visible to the mobile apps beyond what admin marks as paid.
- The "From Last Settlement" period requires at least one settled record to enable. First-time businesses see it disabled.
- Statistics tab uses a 60 s poll for orders; it does not subscribe to real-time order changes.
