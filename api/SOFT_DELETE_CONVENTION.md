# Soft-Delete Convention

All database operations in this API **MUST** go through the repository layer. This ensures soft-delete filtering is applied consistently and prevents accidental exposure of deleted records.

## Pattern

Tables that support soft-delete have an `isDeleted` boolean column (default `false`). Rows are never physically deleted — instead, `isDeleted` is set to `true`.

```ts
// Schema definition
isDeleted: boolean('is_deleted').default(false).notNull(),
```

## Tables with `isDeleted`

| Table | Repository | Notes |
|---|---|---|
| `promotions` | `PromotionRepository` | Also sets `isActive: false` on delete |
| `settlementRules` | `SettlementRuleRepository` | Also sets `isActive: false` on delete |
| `products` | `ProductRepository` | Also sets `isAvailable: false` on delete |
| `productCategories` | `ProductCategoryRepository` | — |
| `drivers` | `DriverRepository` | Also sets `connectionStatus: 'DISCONNECTED'` on delete |
| `optionGroups` | `OptionGroupRepository` | Used by `ProductService` |
| `options` | `OptionRepository` | Used by `ProductService` |
| `banners` | `BannerRepository` | Also sets `isActive: false` on delete |

### Tables that do NOT have `isDeleted` (by design)

- **`users` / `businesses`** — Use `deletedAt` timestamp (legacy pattern, left as-is)
- **`orders`** — Status-tracked (`CANCELLED` = logical delete)
- **`orderItems`, `orderItemOptions`, `orderPromotions`** — Child records of orders
- **`settlements`, `settlementPayments`, `settlementRequests`** — Financial records with own status tracking
- **`auditLogs`, `orderEvents`** — Immutable append-only logs
- **`notifications`, `pushTelemetryEvents`, `businessDeviceHealth`** — Telemetry/logs
- **`deviceTokens`, `liveActivityTokens`, `refreshTokenSessions`** — Ephemeral session data
- **`storeSettings`, `businessHours`** — Configuration singletons
- **`userPromotions`, `promotionUsage`, `promotionBusinessEligibility`** — Junction/transaction tables

## Rules

### 1. Always filter `isDeleted = false` on reads

Every `SELECT` query on a soft-delete table **MUST** include `eq(table.isDeleted, false)` unless it is a **historical lookup** (e.g., resolving a product name for an existing order item).

```ts
// ✅ Correct: active-record query
const products = await db.select().from(products)
  .where(and(eq(products.businessId, id), eq(products.isDeleted, false)));

// ✅ Correct: historical lookup (order was placed when product existed)
const product = await db.select().from(products)
  .where(eq(products.id, orderItem.productId)); // No isDeleted filter

// ❌ Wrong: listing without isDeleted filter
const products = await db.select().from(products)
  .where(eq(products.businessId, id));
```

### 2. Never hard-delete rows from soft-delete tables

```ts
// ✅ Correct: soft-delete
await db.update(promotions)
  .set({ isDeleted: true, isActive: false })
  .where(eq(promotions.id, id));

// ❌ Wrong: hard-delete
await db.delete(promotions).where(eq(promotions.id, id));
```

### 3. Use the repository layer

All new queries against soft-delete tables should go through the corresponding repository. The repository handles `isDeleted` filtering internally so callers don't need to remember it.

```ts
// ✅ Correct: use repository
const product = await productRepository.findById(id);

// ❌ Wrong: direct DB query
const [product] = await db.select().from(products).where(eq(products.id, id));
```

### 4. Historical lookups are exempt

When resolving data for **existing records** (e.g., showing product name on an order, showing driver name on a settlement), do NOT filter by `isDeleted`. The referenced entity may have been deleted after the record was created, and the historical data must still be accessible.

### 5. Dataloaders must include `isDeleted = false`

Dataloaders in `api/src/graphql/dataloaders.ts` batch-load rows by key arrays. They receive `db` directly (not repos) for performance. Any dataloader querying a soft-delete table **MUST** include `eq(table.isDeleted, false)` in its `where` clause. Current soft-delete-aware dataloaders:

- `createDriverByUserIdLoader` — filters `drivers.isDeleted = false`
- `createOptionGroupsByProductIdLoader` — filters `optionGroups.isDeleted = false`
- `createOptionsByOptionGroupIdLoader` — filters `options.isDeleted = false`
- `createVariantsByGroupIdLoader` — filters `products.isDeleted = false`

## When to add `isDeleted` to a new table

Add `isDeleted` when:
- Other tables have foreign key references to this table (especially `RESTRICT`)
- The entity appears in historical records (orders, settlements, audit logs)
- Users might want to "undo" a deletion

Do NOT add `isDeleted` when:
- The table is an immutable log (audit, events, telemetry)
- The table is ephemeral (tokens, sessions)
- The table has its own status tracking (orders, settlements)
- The table is a junction/transaction table that depends on a parent entity's lifecycle
