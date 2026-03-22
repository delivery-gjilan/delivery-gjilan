# Personal Inventory & Order Coverage

> **⚠️ This file has been moved.**
> The active spec is at **[FUTURE_FEATURES/PERSONAL_INVENTORY_COVERAGE.md](../FUTURE_FEATURES/PERSONAL_INVENTORY_COVERAGE.md)** (FF1).
> The content below is kept for git-blame traceability only.

> **Status: Future Feature — Not yet implemented**
> Discussed: 2026-03-22

---

## Problem

The platform operator (you) has a contract with a market (a friend/partner). All market orders go through the market's catalog and products. However, you are slowly building your own private stock of the same items — bought at wholesale — so that when an order comes in, you can fulfill some items from your own inventory at a higher margin instead of sourcing everything from the market.

The market friend still fulfills whatever you don't have. The customer never sees or knows the difference. This is a purely internal/operator-facing tool.

**Example:**

> Order #042 has: 2× Coke 500ml, 1× Feta 200g, 3× Pasta 500g
>
> Your stock has: 1× Coke 500ml, 3× Pasta 500g (zero Feta)
>
> System tells you:
> - ✅ Coke 500ml — you have 1, go get 1 from market
> - ✅ Pasta 500g — you have 3, fully covered
> - 🏪 Feta 200g × 1 — source fully from market

---

## Design Decisions (from discussion)

- **Private sourcing only** — No customer-facing changes. The order, products, and receipt all appear as normal market orders. This is purely an internal fulfillment tool for the operator.
- **Option A schema** — Your stock is mapped directly against the market's existing product IDs. No separate product catalog needed. Simple `(businessId, productId, ownedQuantity)` table.
- **Option B is NOT needed** — You will not sell your own products directly to customers (at least not in this phase). If that ever changes, Option B (own catalog + cross-reference mapping) would be needed, plus the per-business-status order architecture.
- **Stock deduction is manual/optional** — When you confirm an order, you optionally tap to deduct quantities from your personal stock. Not automatic, since partial sourcing (1 from you, 1 from market) needs human judgment.

---

## Proposed Architecture

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

No new product catalog. Just a quantity counter per (business, market-product) pair.

### API

- `Query.myInventory(businessId)` → returns `[{ product, ownedQuantity }]`
- `Mutation.setInventoryQuantity(businessId, productId, quantity)` → upsert
- `Query.orderCoverage(orderId, businessId)` → computes coverage split (see below)

### Order Coverage Logic (`orderCoverage`)

```
For each item in the order:
  look up personal_inventory[businessId][productId]
  
  if ownedQuantity >= item.quantity:
    → FULLY_OWNED (no market trip needed for this item)
  elif ownedQuantity > 0:
    → PARTIALLY_OWNED (you have some, need the rest from market)
    fromStock = ownedQuantity
    fromMarket = item.quantity - ownedQuantity
  else:
    → MARKET_ONLY
```

Return value per item:
```typescript
{
  product: Product,
  orderedQuantity: number,
  fromStock: number,      // 0 if market-only
  fromMarket: number,     // 0 if fully owned
  coverageType: 'FULLY_OWNED' | 'PARTIALLY_OWNED' | 'MARKET_ONLY'
}
```

### Business App UI

**Inventory screen (new tab or accessible from settings):**
- List of all market products
- Editable quantity field per product (tap to increment/decrement or type)
- Saves via `setInventoryQuantity` mutation on blur

**Order card enhancement (in the order list):**
- Small coverage summary badge: e.g. "3/5 items from your stock"
- On expand: per-item breakdown with ✅/🏪 icons
- Optional "Deduct stock" button when marking order as READY — subtracts `fromStock` quantities from your inventory in one mutation call

---

## What's Already in Place

- ✅ Products table has all market items with IDs — inventory can reference them directly
- ✅ Order items already carry `productId` and `quantity` — coverage query is straightforward
- ✅ `businesses` table has `businessType: MARKET` — easy to scope inventory to market-type businesses only
- ✅ Business app auth store already exposes `user.business.businessType` and `user.businessId`
- ✅ PENDING → READY direct transition already implemented for MARKET (2026-03-22) — the flow already supports fast acceptance, deducting stock can happen at the same tap

## What Needs Building

| Component | Effort | Notes |
|---|---|---|
| `personal_inventory` DB table + migration | Small | Simple upsert table |
| GraphQL schema + resolvers | Small | 2 queries + 1 mutation |
| `orderCoverage` query | Medium | Join order items × inventory |
| Business app inventory screen | Medium | Editable list, works offline with optimistic updates |
| Order card coverage UI | Small | Badge + expandable breakdown |
| Optional stock deduction on READY | Small | Batch mutation |

---

## Notes & Constraints

- Inventory quantities should never go negative — enforce via DB check constraint and resolver-level guard
- Stock deduction should be idempotent (safe to retry) — use an "already deducted" flag on order or track via audit log
- This feature is invisible to customers, drivers, and the market operator — no changes to customer-facing or market-facing apps
- When the market catalog updates (product deleted/merged), orphaned inventory rows should be handled gracefully (soft zero, not crash)
- Future: if you ever do want to sell your own products directly, the migration path is adding an optional `own_product_id` column to `personal_inventory` and linking it to a new `businesses` entry for your own storefront

---

## Related Docs

- [BACKEND/DATABASE_SCHEMA.md](../BACKEND/DATABASE_SCHEMA.md) — B7: table conventions to follow
- [BUSINESS_LOGIC/PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md](PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md) — BL2: product CRUD patterns
- [BUSINESS_LOGIC/CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md](CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md) — BL3: order lifecycle
