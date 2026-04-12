# FF1 — Personal Inventory & Order Coverage

> **Status: Future Feature — Not yet implemented**
> Discussed: 2026-03-22 · Revised: 2026-04-12
> Supersedes: `docs/BUSINESS_LOGIC/PERSONAL_INVENTORY_COVERAGE.md` (BL4, now deprecated in favour of this file)

---

## ⚠️ Pre-Implementation Checklist

> **Before writing a single line of code, read the current MDS docs.**
> The system changes continuously. The design below was last verified on 2026-04-12 — table names, API patterns, business type values, and settlement logic may have evolved.

| Doc | Why you need it |
|-----|----------------|
| [B7 — DATABASE_SCHEMA](../BACKEND/DATABASE_SCHEMA.md) | Verify `products`, `businesses`, `order_items` table names and column names before writing migrations |
| [B2 — ORDER_CREATION](../BACKEND/ORDER_CREATION.md) | Confirm order item shape and `productId` field availability |
| [BL2 — PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW](../BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) | Check if product CRUD patterns have changed |
| [BL3 — CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS](../BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) | Confirm order lifecycle hasn't changed (e.g. PENDING→READY shortcut for MARKET) |
| [B1 — API](../BACKEND/API.md) | Verify GraphQL resolver patterns and auth directives |
| [B8 — CACHE](../BACKEND/CACHE_AND_INFRASTRUCTURE.md) | Understand cache invalidation before adding new queries |
| [MDS_INDEX](../MDS_INDEX.md) | Check for any new docs added since this revision that may be relevant |

---

## Problem

The platform operator has a contract with a market (a friend/partner). All market orders go through the market's catalog. The operator is building their own private stock of the same items — bought at wholesale — so that when an order arrives, some items can be fulfilled from personal stock at higher margin instead of sourcing everything from the market.

The market partner fulfills whatever the operator doesn't have. The customer never sees or knows the difference. This is a purely internal operator tool.

**Example:**

> Order #042: 3× Coke 500ml, 1× Feta 200g, 3× Pasta 500g
>
> Operator stock: 2× Coke 500ml, 3× Pasta 500g, 0× Feta
>
> System shows:
> - ✅ Coke 500ml × 3 — **2 from your stock**, 1 from market
> - ✅ Pasta 500g × 3 — fully covered from your stock
> - 🏪 Feta 200g × 1 — all from market
>
> **Driver instructions:** Pick up 2× Coke + 3× Pasta from operator address, then pick up 1× Coke + 1× Feta from the market.

---

## Core Concepts

### Inventory Mode

The whole feature is gate-kept behind an **Inventory Mode** toggle. When off, the system behaves exactly as it does today — everything sourced from the listed market.

| State | Behavior |
|-------|----------|
| **Inventory Mode ON** | Orders show coverage breakdown. Driver gets split-pickup instructions (your stock → market for remainder). |
| **Inventory Mode OFF** | Everything goes through the market. No driver rerouting. No coverage UI. Normal flow. |

The operator can flip this toggle at any time via the admin panel. Use case: when too busy, on vacation, out of stock on everything, or simply don't want drivers coming to your house — turn it off and the platform runs like normal.

### Coverage Categories

For each order item line, the system calculates one of three coverage states:

| State | Meaning |
|-------|---------|
| `FULLY_OWNED` | Entire quantity covered from operator stock. Driver picks up from operator only. |
| `PARTIALLY_OWNED` | Some from operator stock, remainder from market. Driver picks up from both locations. |
| `MARKET_ONLY` | No stock. Driver picks up entirely from market. |

If **all items** in an order are `MARKET_ONLY`, the driver just goes to the market (no split pickup needed).

---

## Design Decisions

- **Private sourcing only** — No customer-facing changes. Orders, products, and receipts look like normal market orders. Purely an internal fulfillment tool.
- **Option A schema** — Stock is mapped directly to the market's existing product IDs. No separate product catalog. Simple `(businessId, productId, ownedQuantity)` table.
- **Option B explicitly deferred** — Operator will not sell their own products directly to customers in this phase. If that changes: Option B (own catalog + cross-reference mapping) + per-business-status order architecture would be needed.
- **Stock deduction is manual/optional** — Operator taps "Deduct from stock" when confirming an order. Not automatic, since partial sourcing needs human judgment.
- **Toggle is platform-level** — Since there is only one market with inventory capability, the toggle lives on `store_settings` (alongside `dispatchModeEnabled`, `isStoreClosed`, etc). If multi-business inventory is ever needed, this moves to a per-business flag.

---

## Proposed Architecture

> ⚠️ Verify all referenced table/column names against B7 (DATABASE_SCHEMA) before implementing.

### 1. Database

#### `personal_inventory` table (new)

```sql
CREATE TABLE personal_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_price  NUMERIC(10,2),  -- wholesale purchase price (optional, for profit tracking)
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, product_id)
);
```

#### `store_settings` addition (new column)

```sql
ALTER TABLE store_settings
  ADD COLUMN inventory_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

This sits alongside `dispatchModeEnabled` and `isStoreClosed` — admin can toggle it from the same panel.

#### `order_coverage_log` table (new, optional)

```sql
CREATE TABLE order_coverage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  ordered_qty INTEGER NOT NULL,
  from_stock  INTEGER NOT NULL DEFAULT 0,
  from_market INTEGER NOT NULL DEFAULT 0,
  deducted    BOOLEAN NOT NULL DEFAULT FALSE,
  deducted_at TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id, product_id)
);
```

This records the coverage decision per order so the operator has a history. It also prevents double-deduction.

### 2. API

| Operation | Type | Auth | Notes |
|-----------|------|------|-------|
| `myInventory(businessId)` | Query | SUPER_ADMIN | Returns `[{ product, ownedQuantity, costPrice }]` |
| `setInventoryQuantity(businessId, productId, quantity, costPrice?)` | Mutation | SUPER_ADMIN | Upsert into `personal_inventory` |
| `bulkSetInventory(businessId, items: [{ productId, quantity }])` | Mutation | SUPER_ADMIN | Batch update for restocking |
| `orderCoverage(orderId)` | Query | SUPER_ADMIN | Per-item coverage split (only computed when inventory mode is ON) |
| `deductOrderStock(orderId)` | Mutation | SUPER_ADMIN | Deduct `from_stock` amounts from `personal_inventory`, mark `deducted=true` |
| `inventoryModeEnabled` | on `StoreStatus` | Any | Exposed in `getStoreStatus` so admin UI can read it |
| `updateStoreStatus(inventoryModeEnabled)` | Mutation | SUPER_ADMIN | Toggle on/off |

### 3. Coverage Logic

```
if inventoryModeEnabled == false:
  → skip all coverage calculation, order flows normally

for each order item:
  ownedQty = personal_inventory[businessId][productId] ?? 0

  if ownedQty >= item.quantity  → FULLY_OWNED  (fromStock=qty, fromMarket=0)
  if ownedQty > 0               → PARTIALLY_OWNED (fromStock=ownedQty, fromMarket=qty-ownedQty)
  if ownedQty == 0              → MARKET_ONLY  (fromStock=0, fromMarket=qty)
```

### 4. Driver Routing

When inventory mode is ON and an order has at least one `FULLY_OWNED` or `PARTIALLY_OWNED` item:

| Scenario | Driver Instructions |
|----------|-------------------|
| All items `FULLY_OWNED` | Single pickup from operator address only. No market stop needed. |
| Mixed (some owned, some market) | Two-stop pickup: (1) operator address for stocked items, (2) market for remaining items. |
| All items `MARKET_ONLY` | Single pickup from market only (normal flow). |

**Implementation approach:** The driver app currently reads `order.businesses[0].business.location` as the pickup point. For split-pickup orders, the system provides an additional `operatorPickup` location and a `pickupInstructions` string in the order data. The driver app would show a two-stop pickup route when both exist.

> **Note:** The driver doesn't need to know why there are two stops. They just see "Pickup A" (operator address) and "Pickup B" (market).

**Operator pickup address:** Stored once as a new field on `store_settings.operator_pickup_lat/lng/address` (since only one operator exists). Alternatively, a hardcoded config value if you don't want it in the DB.

### 5. Admin Panel UI

#### Inventory Mode Toggle

Add an "Inventory Mode" switch to the admin panel store settings, next to the existing dispatch mode and store closed toggles. Simple on/off switch with a descriptive label:

- **ON:** "Orders will show stock coverage. Drivers may get split-pickup routes."
- **OFF:** "All orders go straight to the market."

#### Inventory Management Screen

A new admin panel page listing all products from the linked market with:

- Product name + image
- Current stock quantity (editable inline)
- Cost price (optional, for margin tracking)
- Quick "+10" / "-1" buttons for fast restocking
- "Out of stock" (set to 0) button
- Search/filter by category
- Bulk restock mode: scan through products and enter new quantities after a wholesale purchase

#### Order Coverage View

When inventory mode is on, each order card in the admin panel shows:

- A coverage badge: "4/6 items from stock" or "Fully from stock" or "All from market"
- Per-item breakdown with ✅ (from stock) / 🏪 (from market) icons
- "Deduct Stock" button (one-tap to subtract stocked quantities from inventory)

### 6. Mobile-Business App

No changes needed in the mobile-business app for the initial release. The market business owner doesn't know about the inventory system — they just see normal orders. Coverage is visible only in the admin panel.

---

## Profit Margin Tracking (Recommended Future Add-On)

Once `cost_price` is captured per inventory item, a simple profit summary becomes possible:

```
For each delivered order with stocked items:
  Revenue from stocked items = sum(finalAppliedPrice × fromStock)
  Cost of stocked items      = sum(costPrice × fromStock)
  Gross margin               = Revenue - Cost

  Items sourced from market at retail have no margin gain (0% savings).
```

This could power a simple "Savings this month" widget in the admin panel. Not essential for MVP but trivially added once cost_price is populated.

---

## Rollout Plan (Recommended Phases)

### Phase 1 — Core (MVP)

| Component | Effort | Description |
|-----------|--------|-------------|
| `personal_inventory` migration | Small | DB table + Drizzle schema |
| `inventoryModeEnabled` on `store_settings` | Small | New boolean column |
| GraphQL schema + resolvers (queries + mutations) | Small | `myInventory`, `setInventoryQuantity`, `orderCoverage` |
| Admin panel: inventory mode toggle | Small | Switch on settings page |
| Admin panel: inventory management screen | Medium | Product list with stock quantities |
| Admin panel: order coverage view | Medium | Per-item ✅/🏪 breakdown on order cards |
| Manual stock deduction (`deductOrderStock`) | Small | One-tap button on order card |

### Phase 2 — Driver Split-Pickup

| Component | Effort | Description |
|-----------|--------|-------------|
| Operator pickup address configuration | Small | New fields on `store_settings` |
| Order data: `operatorPickup` + `pickupInstructions` | Medium | New fields on order, populated at coverage calculation time |
| Driver app: two-stop pickup route | Medium | Show second pickup pin + route when `operatorPickup` exists |
| Driver app: pickup checklist | Small | Show which items to grab at each stop |

### Phase 3 — Polish & Analytics

| Component | Effort | Description |
|-----------|--------|-------------|
| `order_coverage_log` table | Small | Historical record of coverage decisions |
| `cost_price` tracking | Small | Wholesale price per item |
| Profit margin dashboard | Medium | Revenue vs cost for stocked items |
| `bulkSetInventory` mutation | Small | Batch restock after wholesale purchase |
| Low-stock alerts | Small | Push notification when items drop below threshold |

---

## What Is Already in Place (as of 2026-04-12)

> Re-verify each of these before implementing — they may have changed.

- ✅ `products` table holds all market items with stable UUIDs
- ✅ Order items carry `productId` and `quantity`
- ✅ `businesses.businessType = 'MARKET'` available for scoping
- ✅ Business app auth store exposes `user.business.businessType` and `user.businessId`
- ✅ PENDING → READY direct transition is implemented for MARKET orders
- ✅ `store_settings` table exists with platform-level toggles (`dispatchModeEnabled`, `isStoreClosed`, `bannerEnabled`)
- ✅ `StoreStatus` GraphQL type already exposes store toggles and has a subscription (`storeStatusUpdated`)
- ✅ Driver app reads pickup location from `order.businesses[0].business.location`
- ✅ Driver navigation uses `buildNavOrder()` with pickup/dropoff points — extendable to multi-stop
- ✅ Admin panel has a store settings section where the toggle can be added

## Constraints

- Quantities must never go negative — enforce via DB `CHECK` and resolver guard
- Stock deduction must be idempotent — prevent double-deduction via `order_coverage_log.deducted` flag
- Feature is invisible to customers and the market business owner
- Drivers see pickup instructions but don't know the reason for split pickups
- Handle orphaned inventory rows gracefully if the market soft-deletes a product (soft zero, no crash)
- Inventory mode toggle must be instant — no downtime, no order interruption. Orders already in progress when toggled off continue with normal market-only fulfillment.

---

## Recommendations

1. **Start with Phase 1 only.** The admin-panel-only coverage view gives you 80% of the value with minimal complexity. You can manually tell drivers where to go until Phase 2 is built.

2. **Don't over-stock initially.** Start with 5-10 high-volume products (drinks, snacks) that you know sell consistently. Use the `orderCount` field on products to identify your best sellers.

3. **Keep cost_price from day one.** Even if you don't build the margin dashboard yet, recording what you paid per item is invaluable. You'll thank yourself later — retroactively figuring out wholesale prices is painful.

4. **The toggle is your safety valve.** Bad weather, personal emergency, going on vacation — one tap and everything goes back to market-only. No half measures, no data loss. Your stock numbers stay in the DB for when you come back.

5. **Phase 2 (driver split-pickup) is the biggest UX risk.** Two-stop pickups add delivery time and driver confusion. Consider whether it's simpler to have drivers always go to your location first (you hand off the stocked items), and then send them to the market for the rest — versus trying to combine it into one trip. The sequential approach is clearer for drivers.

6. **Don't build auto-deduction.** Manual "Deduct Stock" is safer. You might give away a product that broke, or a customer might cancel. Keep the human in the loop for stock adjustments.

7. **Consider a restock reminder.** A simple push notification when any tracked product hits quantity ≤ 2 saves you from running out unexpectedly. Trivial to add once the inventory table exists.
