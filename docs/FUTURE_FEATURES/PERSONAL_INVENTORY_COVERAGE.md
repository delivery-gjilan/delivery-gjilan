# FF1 — Personal Inventory & Order Coverage

> **Status: Future Feature — Not yet implemented**
> Discussed: 2026-03-22
> Supersedes: `docs/BUSINESS_LOGIC/PERSONAL_INVENTORY_COVERAGE.md` (BL4, now deprecated in favour of this file)

---

## ⚠️ Pre-Implementation Checklist

> **Before writing a single line of code, read the current MDS docs.**
> The system changes continuously. The design below was accurate on 2026-03-22 — table names, API patterns, business type values, and settlement logic may have evolved.

| Doc | Why you need it |
|-----|----------------|
| [B7 — DATABASE_SCHEMA](../BACKEND/DATABASE_SCHEMA.md) | Verify `products`, `businesses`, `order_items` table names and column names before writing migrations |
| [B2 — ORDER_CREATION](../BACKEND/ORDER_CREATION.md) | Confirm order item shape and `productId` field availability |
| [BL2 — PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW](../BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) | Check if product CRUD patterns have changed |
| [BL3 — CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS](../BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) | Confirm order lifecycle hasn't changed (e.g. PENDING→READY shortcut for MARKET) |
| [B1 — API](../BACKEND/API.md) | Verify GraphQL resolver patterns and auth directives |
| [B8 — CACHE](../BACKEND/CACHE_AND_INFRASTRUCTURE.md) | Understand cache invalidation before adding new queries |
| [MDS_INDEX](../MDS_INDEX.md) | Check for any new docs added since 2026-03-22 that may be relevant |

---

## Problem

The platform operator has a contract with a market (a friend/partner). All market orders go through the market's catalog. The operator is slowly building their own private stock of the same items — bought at wholesale — so that when an order arrives, some items can be fulfilled from personal stock at higher margin instead of sourcing everything from the market.

The market partner fulfills whatever the operator doesn't have. The customer never sees or knows the difference. This is a purely internal operator tool.

**Example:**

> Order #042: 2× Coke 500ml, 1× Feta 200g, 3× Pasta 500g
>
> Operator stock: 1× Coke 500ml, 3× Pasta 500g, 0× Feta
>
> System shows:
> - ✅ Coke 500ml × 2 — you have 1, go get 1 from market
> - ✅ Pasta 500g × 3 — fully covered from your stock
> - 🏪 Feta 200g × 1 — source fully from market

---

## Design Decisions (from discussion)

- **Private sourcing only** — No customer-facing changes. Orders, products, and receipts appear as normal market orders. Purely an internal fulfillment tool.
- **Option A schema** — Stock is mapped directly to the market's existing product IDs. No separate product catalog. Simple `(businessId, productId, ownedQuantity)` table.
- **Option B explicitly deferred** — Operator will not sell their own products directly to customers in this phase. If that changes: Option B (own catalog + cross-reference mapping) + per-business-status order architecture would be needed.
- **Stock deduction is manual/optional** — Operator taps "Deduct from stock" when confirming an order. Not automatic, since partial sourcing needs human judgment.

---

## Proposed Architecture

> ⚠️ Verify all referenced table/column names against B7 (DATABASE_SCHEMA) before implementing.

### Database

```sql
CREATE TABLE personal_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, product_id)
);
```

### API

- `Query.myInventory(businessId)` → `[{ product, ownedQuantity }]`
- `Mutation.setInventoryQuantity(businessId, productId, quantity)` → upsert
- `Query.orderCoverage(orderId, businessId)` → per-item coverage split

### Coverage Logic

```
for each order item:
  ownedQty = personal_inventory[businessId][productId] ?? 0

  if ownedQty >= item.quantity  → FULLY_OWNED
  if ownedQty > 0               → PARTIALLY_OWNED (fromStock=ownedQty, fromMarket=remainder)
  if ownedQty == 0              → MARKET_ONLY
```

### Business App UI

**Inventory screen** — list of market products with editable quantity per item.

**Order card** — coverage badge ("3/5 from your stock") + per-item ✅/🏪 breakdown + optional "Deduct stock" button at mark-ready time.

---

## What Was Already in Place (as of 2026-03-22)

> Re-verify each of these before implementing — they may have changed.

- ✅ `products` table held all market items with stable UUIDs
- ✅ Order items carried `productId` and `quantity`
- ✅ `businesses.businessType = 'MARKET'` available for scoping
- ✅ Business app auth store exposed `user.business.businessType` and `user.businessId`
- ✅ PENDING → READY direct transition implemented for MARKET orders

## Build Checklist

| Component | Effort |
|-----------|--------|
| `personal_inventory` migration | Small |
| GraphQL schema + resolvers (2 queries, 1 mutation) | Small |
| `orderCoverage` query (join order_items × inventory) | Medium |
| Business app inventory screen | Medium |
| Order card coverage UI (badge + breakdown) | Small |
| Optional batch stock deduction on READY | Small |

## Constraints

- Quantities must never go negative — enforce via DB `CHECK` and resolver guard
- Stock deduction must be idempotent — track via audit log or a `deductedAt` flag on the order
- Feature is invisible to customers, drivers, and the market operator
- Handle orphaned inventory rows gracefully if the market deletes a product (soft zero, no crash)
