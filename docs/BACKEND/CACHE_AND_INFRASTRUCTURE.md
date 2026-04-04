# Cache & Infrastructure

<!-- MDS:B8 | Domain: Backend | Updated: 2026-04-04 -->
<!-- Depends-On: B1 -->
<!-- Depended-By: B2, B3 -->
<!-- Nav: Changing TTLs or adding a new cached entity → update this file. Adding a new service that reads from cache → update the Depended-By list. -->

## Overview

The cache layer is a thin Redis wrapper defined in `api/src/lib/cache.ts`. It is designed to be optional: if Redis is unavailable, the API falls through to the database with no errors.

**Key design principles:**
- **Lazy connect** — Redis connection is established on the first cache access, not at startup
- **Single attempt** — if the initial connection fails, `disabled = true` is set and no further reconnection attempts occur (prevents log spam)
- **No-throw** — all public methods swallow exceptions; callers never need try/catch around cache calls
- **TTL-based eviction** — every write sets an explicit TTL; there is no LRU eviction policy dependency

---

## Connection Behavior

```
First cache call
  └─ disabled? → return null (cache miss, fall through to DB)
  └─ already connected? → return existing client
  └─ try connect (timeout: 3s, reconnectStrategy: false)
      ├─ success → connected = true, log info
      └─ failure → disabled = true, client = null, log info (NOT error)
```

The `reconnectStrategy: false` option on the socket means Redis will never retry after a dropped connection mid-run. If the Redis server restarts while the API is running, the cache stays disabled for the lifetime of the process (resolved by restarting the API process).

---

## TTLs

| Constant | Key Pattern | TTL | Rationale |
|----------|-------------|-----|-----------|
| `TTL.BUSINESSES` | `cache:businesses` | 5 min | All-businesses list, changes infrequently |
| `TTL.BUSINESS` | `cache:business:{id}` | 5 min | Individual business detail |
| `TTL.PRODUCTS` | `cache:products:{businessId}` | 2 min | Product lists change more frequently |
| — | `cache:product:{id}` | Uses `TTL.PRODUCTS` (2 min) | Single product |
| `TTL.CATEGORIES` | `cache:categories:{businessId}` | 10 min | Very stable |
| `TTL.SUBCATEGORIES` | `cache:subcategories:{businessId}` | 10 min | Very stable |
| — | `cache:subcategories-cat:{categoryId}` | Uses `TTL.SUBCATEGORIES` | Subcategories by category |
| `TTL.DELIVERY_ZONES` | `cache:delivery-zones:active` | 5 min | Active delivery polygons are reference data and change infrequently |
| `TTL.DELIVERY_PRICING_TIERS` | `cache:delivery-pricing-tiers:active` | 5 min | Active delivery tiers are reference data and change infrequently |

---

## Key Patterns

```
cache:businesses                         — full business list
cache:business:{id}                      — single business
cache:products:{businessId}              — product list for a business
cache:product:{id}                       — single product
cache:categories:{businessId}            — categories for a business
cache:subcategories:{businessId}         — subcategories for a business
cache:subcategories-cat:{categoryId}     — subcategories filtered by category
cache:delivery-zones:active              — active delivery zones ordered by sortOrder
cache:delivery-pricing-tiers:active      — active delivery tiers ordered by sortOrder/minDistance
```

All keys are namespaced with `cache:` prefix. No other prefix is used.

---

## Public API

```typescript
import { cache } from '@/lib/cache';

// Generic
await cache.get<T>(key)              // → T | null
await cache.set(key, value, ttl)     // → void
await cache.del(...keys)             // → void
await cache.delPattern('cache:*')    // → void (SCAN + DEL, batched 100)

// Helpers
await cache.invalidateBusiness(businessId)      // del businesses + business:{id}
await cache.invalidateAllBusinesses()           // del businesses + all cache:business:*
await cache.invalidateProducts(businessId, productId?)   // del products:{businessId} [+ product:{id}]
await cache.invalidateCategories(businessId)    // del categories:{businessId}
await cache.invalidateSubcategories(businessId, categoryId?)  // del subcategories:{businessId} [+ subcategories-cat:{categoryId}]
await cache.invalidateDeliveryPricing()         // del active zone/tier reference data

// Health
await cache.ping()                   // → { ok: boolean; disabled: boolean }

// Lifecycle
await cache.disconnect()             // graceful quit (used in app shutdown)
```

`delPattern` uses `SCAN` in a loop (cursor-based, 100 keys per batch) to avoid `KEYS *` blocking Redis.

---

## Where Cache Is Used

Services call the invalidation helpers immediately after writes. The read-through pattern is implemented inline in the service: check cache → on miss, query DB → write to cache.

| Service | Reads | Invalidates On |
|---------|-------|---------------|
| `BusinessService` | `cache:businesses`, `cache:business:{id}` | business create/update/delete |
| `ProductService` | `cache:products:{businessId}`, `cache:product:{id}` | product create/update/delete |
| `ProductCategoryService` | `cache:categories:{businessId}` | category create/update/delete |
| `ProductSubcategoryService` | `cache:subcategories:{businessId}`, `cache:subcategories-cat:{categoryId}` | subcategory create/update/delete |
| `OrderService` | `cache:delivery-zones:active`, `cache:delivery-pricing-tiers:active` | delivery-zone or delivery-tier admin changes |
| `directionsRoutes.ts` | `dir:{points}:s={steps}:l={lang}` | never invalidated (TTL-only, 65 s). Cross-client: mobile-customer, mobile-driver, and admin-panel may share the same Redis entry when routes overlap. |

---

## Environment Variable

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Full Redis connection URL |

---

## Known Gaps

- **No reconnect after mid-run disconnect.** If Redis drops while the API is running, the process must be restarted to re-enable caching.  
- **No global cache flush command.** Admin operations that affect multiple businesses (e.g., bulk product update) must call invalidation helpers per entity. There is no "nuke everything" method exposed in the cache API (though `delPattern('cache:*')` works internally).
- **Order and user data are not cached.** Redis is used for catalog data, delivery-pricing reference data, live ETA helpers, and directions results, but individual order rows still come straight from Postgres.
