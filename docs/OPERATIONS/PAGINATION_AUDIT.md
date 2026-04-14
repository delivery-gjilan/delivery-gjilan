<!--
MDS ID: O13
Depends-On: B1 (API), B7 (DB schema), M1 (Mobile overview)
Depended-By: O5 (Security), O9 (Stress testing)
Nav: Pagination audit across all 6 apps. Start here to find unbounded queries.
-->

# Pagination Audit — Full System

**Date:** 2026-03-26 (updated 2026-04-13 — mobile-driver + mobile-business settlement pagination added)  
**Scope:** `api/`, `admin-panel/`, `mobile-customer/`, `mobile-driver/`, `mobile-business/`, `mobile-admin/`

---

## Executive Summary

- **0 of 6 apps** use cursor-based pagination or `pageInfo`/`hasNextPage`.
- **1 of 6 apps** has a working UI paginator (admin-panel audit logs only).
- **3 apps** now implement `fetchMore` load-more: `mobile-customer` (order history), `mobile-driver` (settlements), `mobile-business` (settlements).
- Several API queries accept `limit`/`offset` but clients never pass them (dead args).
- Multiple high-risk unbounded queries exist that will degrade at scale.

---

## 1. API / Backend (`api/src/`)

### 1a. GraphQL Schema — Queries with Pagination Args

| Query | Args | Return type | Risk notes |
|---|---|---|---|
| `auditLogs(...)` | `limit: Int, offset: Int` | `AuditLogConnection!` | ✅ Returns `total` for UI |
| `businessMessages(businessUserId, ...)` | `limit: Int, offset: Int` | `[BusinessMessage!]!` | ✅ |
| `myBusinessMessages(...)` | `limit: Int, offset: Int` | `[BusinessMessage!]!` | ✅ |
| `driverMessages(driverId, ...)` | `limit: Int, offset: Int` | `[DriverMessage!]!` | ✅ |
| `myDriverMessages(...)` | `limit: Int, offset: Int` | `[DriverMessage!]!` | ✅ |
| `settlements(...)` | `limit: Int, offset: Int` | `[Settlement!]!` | ✅ |
| `settlementPayments(...)` | `limit: Int, offset: Int` | `[SettlementPayment!]!` | ✅ |
| `settlementRequests(businessId, status, ...)` | `limit: Int, offset: Int` | `[SettlementRequest!]!` | ✅ default: limit=50, offset=0 |
| `pushTelemetryEvents(...)` | `limit: Int` | `[PushTelemetryEvent!]!` | ⚠️ limit only, no offset; max 500 |
| `deviceTokens(userId)` | `limit: Int` (schema only) | `[DeviceToken!]!` | ⚠️ resolver ignores limit arg — see §1c |
| `orders(limit, offset)` ✅ **FIXED** | `limit: Int, offset: Int` | `[Order!]!` | ✅ Added. ADMIN: default 500; DRIVER: default 200 |
| `ordersByStatus(status, limit, offset)` ✅ **FIXED** | `limit: Int, offset: Int` | `[Order!]!` | ✅ Added. Default limit=500, offset=0 |
| `cancelledOrders(limit, offset)` ✅ **FIXED** | `limit: Int, offset: Int` | `[Order!]!` | ✅ Added. Default limit=500, offset=0 |
| `users(limit, offset)` ✅ **FIXED** | `limit: Int, offset: Int` | `[User!]!` | ✅ Added. Default limit=2000, offset=0 |

### 1b. GraphQL Schema — Queries with NO Pagination Args (unbounded `[T!]!`)

| Query | Resolver path | DB behaviour | Risk |
|---|---|---|---|
| ~~`orders` (ADMIN role)~~ | ~~`orders.ts`~~ | ~~`findAll(limit=500)` — hard cap~~  | ✅ **FIXED** — now `orders(limit, offset)`, default 500/0 |
| ~~`orders` (DRIVER role)~~ | ~~same resolver, `findForDriver`~~ | ~~no limit~~ | ✅ **FIXED** — `findForDriver(driverId, limit=200)` |
| `orders` (CUSTOMER role) | same resolver, `findByUserId` | `findByUserId(limit=100, offset=0)` ✅ FIXED | ✅ **FIXED** — customer order history supports load-more via `fetchMore` |
| `orders` (BUSINESS role) | same resolver, `getOrdersByBusinessId` | no limit | 🟡 MEDIUM: large businesses with many orders |
| ~~`ordersByStatus(status)` (any role)~~ | ~~`ordersByStatus.ts`~~ | ~~`findByStatus` — no limit~~ | ✅ **FIXED** — `findByStatus(status, limit=500, offset=0)` |
| ~~`cancelledOrders`~~ | ~~`cancelledOrders.ts`~~ | ~~no limit~~ | ✅ **FIXED** — limit=500, offset=0 passed |
| `uncompletedOrders` (ADMIN/DRIVER) | `uncompletedOrders.ts` | `getUncompletedOrders()` — no limit | 🟡 MEDIUM: bounded by number of live orders |
| ~~`users`~~ | ~~`users.ts`~~ | ~~`getAllUsers()` — no limit~~ | ✅ **FIXED** — `findAllUsers(limit=2000, offset=0)` safety cap |
| `drivers` | `drivers.ts` | `authService.getDrivers()` — no limit | 🟡 MEDIUM: typically bounded (~10–200 drivers) |
| `businesses` | `api/src/models/Business/...` | no limit | 🟡 MEDIUM: ~100 businesses typical |
| `getPromotionUsage(promotionId)` | `api/src/models/Promotion/...` | `getUsageByPromotion(promotionId, limit=500, offset=0)` ✅ FIXED | ✅ **FIXED** — limit=500 default, args on schema |
| `getUserPromotions(userId)` | Promotion resolver | no limit | 🟢 LOW: bounded per user |
| `getAllPromotions(isActive)` | Promotion resolver | no limit | 🟡 MEDIUM: grows with admin-created promotions |
| `notificationCampaigns` | `notificationCampaigns.ts` | `getAllCampaigns()` — no limit | 🟡 MEDIUM: admin-only, typically bounded |
| `businessMessageThreads` | BusinessMessage resolver | no limit | 🟡 MEDIUM |
| `driverMessageThreads` | DriverMessage resolver | no limit | 🟡 MEDIUM |
| `products(businessId)` | Product resolver | no limit | 🟢 LOW: per-business, typically bounded |
| `productCategories(businessId)` | ProductCategory resolver | no limit | 🟢 LOW |
| `productSubcategories(...)` | productSubcategories resolver | no limit | 🟢 LOW |
| `deliveryZones` | DeliveryZone resolver | no limit | 🟢 LOW |
| `deliveryPricingTiers` | DeliveryPricing resolver | no limit | 🟢 LOW |
| `getBanners(activeOnly)` | Banner resolver | no limit | 🟢 LOW |
| `settlementRules(filter)` | SettlementRule resolver | no limit | 🟢 LOW |
| `myAddresses` | UserAddress resolver | no limit | 🟢 LOW |

### 1c. Repository-Layer Pagination Implementation

| Repository | Methods with limit/offset | Methods without limit | Notes |
|---|---|---|---|
| `AuditLogRepository` | `getLogs(filters)` — applies `.limit()` and `.offset()` | — | ✅ Full implementation; returns total count |
| `SettlementRepository` | `getMany(filters)` — applies `.limit()` and `.offset()` | — | ✅ |
| `SettlementPaymentRepository` | `getPayments(filters)` — applies `.limit()` and `.offset()` | — | ✅ |
| `SettlementRequestRepository` | `getMany(filters)` — applies `.limit()` and `.offset()` | — | ✅ |
| `OrderRepository` | `findAll(limit=500, offset=0)` ✅, `findByUserId(limit=100, offset=0)` ✅, `findByStatus(limit=500, offset=0)` ✅, `findForDriver(limit=200)` ✅ | `findByBusinessId`, `findUncompletedOrders` | ✅ All high-risk methods now have limits. Also adds `countAll()`, `countByStatus()` helpers. |
| `NotificationRepository` | `getPushTelemetryEvents` — `Math.min(limit ?? 100, 500)` | — | ⚠️ Partial: limit only, no offset |
| `PromotionRepository` | `getMany(filters)` — limit/offset applied | — | ✅ (schema doesn't expose these args though) |
| Business message `businessMessages.ts` resolver | `.limit(limit).offset(offset)` inline in resolver | — | ✅ |
| Driver message `driverMessages.ts` resolver | `.limit(limit).offset(offset)` inline in resolver | — | ✅ |
| `deviceTokens` resolver | ⚠️ **Schema has `limit: Int` arg but resolver calls `getTokensByUserId(userId)` with no limit passed** | — | Bug: pagination arg accepted but silently ignored |

### 1d. Cursor / Page-Info based pagination

**None.** No relay-style `Connection`/`PageInfo`/`hasNextPage`/`endCursor` patterns exist anywhere in the schema, except `AuditLogConnection` which only returns `logs: [AuditLog!]!` + `total: Int!` (not a cursor connection, just a total count).

---

## 2. Admin Panel (`admin-panel/src/`)

### What IS paginated

| Page | File | Mechanism | Notes |
|---|---|---|---|
| Audit Logs | `src/app/dashboard/logs/page.tsx` | `PAGE_SIZE=50`, `page` state, `limit: PAGE_SIZE, offset: page * PAGE_SIZE` passed to `GET_AUDIT_LOGS`, previous/next UI | ✅ Fully working server-side pagination |

### Partial implementations (hard-coded limits, no UI pager)

| Page | File | Query | Pattern | Problem |
|---|---|---|---|---|
| Financial Settlements (new) | `src/app/admin/financial/settlements/page.tsx` | `GET_SETTLEMENTS_PAGE` | `limit: 200` hard-coded, `offset` never passed | Records after 200 silently missing |
| Finances Dashboard | `src/app/dashboard/finances/page-new.tsx` | `GET_SETTLEMENTS` | No `limit`/`offset` passed at all | Fully unbounded |
| Settlement requests (in financial page) | same file, line 520 | `AdminGetSettlementRequests` | `limit: 20` hard-coded for business context | Only shows 20 |
| Business messages | `src/app/admin/business-messages/page.tsx` | `GetBusinessMessages` | Query accepts `limit`/`offset`, but need to verify if passed | Partial — args defined but check page usage |
| Driver messages | `src/app/admin/messages/page.tsx` | `GetDriverMessages` | Same as above | Partial |

### NOT paginated (fully unbounded fetches)

| Page | File | Query | Data volume risk |
|---|---|---|---|
| Orders | `src/app/dashboard/orders/page.tsx` → `useOrders` hook | `GET_ORDERS` → `orders` (admin: 500 cap) | 🔴 HIGH — admin sees only 500 most recent orders; older orders invisible |
| Businesses | `src/app/dashboard/businesses/page.tsx` | `GET_BUSINESSES` (`businesses` = no limit) | 🟡 MEDIUM |
| Admin Users/Admins | `src/app/dashboard/admins/page.tsx` | `USERS_QUERY` (`users` = no limit) | 🔴 HIGH — all users fetched to client |
| Map | `src/app/dashboard/map/page.tsx` | `GET_ORDERS` + `GET_DRIVERS` | 🔴 HIGH — orders same 500 cap issue |
| Notifications | `src/app/dashboard/notifications/page.tsx` | `GET_NOTIFICATION_CAMPAIGNS` (no limit) | 🟡 MEDIUM |
| Market (products) | `src/app/dashboard/market/page.tsx` | `ProductsAndCategories` (per business) | 🟢 LOW |
| Delivery Zones | `src/app/dashboard/delivery-zones/page.tsx` | `GetDeliveryZones` | 🟢 LOW |
| Banners | `src/app/admin/banners/page.tsx` | `GetBanners` | 🟢 LOW |

---

## 3. mobile-customer

**No `onEndReached` calls anywhere.** No `fetchMore`. No infinite scroll. No pagination state variables.

| Screen / Component | File | Query | Pagination |
|---|---|---|---|
| Order History | `app/orders/history.tsx` → `modules/orders/components/OrderHistoryList.tsx` | `GET_ORDERS` via `useOrders` hook — `limit: 30, offset: orders.length` | ✅ **FIXED** — `PAGE_SIZE=30`, `fetchMore` on `onEndReached`, footer spinner, `hasMore` guard |
| Active Orders | `modules/orders/components/ActiveOrdersList.tsx` | Apollo cache from `GET_ORDERS` | ⚠️ Same cache (only active orders, bounded by nature) |
| Profile orders count | `app/(tabs)/profile.tsx` | `GET_ORDERS` from cache | ⚠️ Same |
| Analytics | `app/(tabs)/analytics.tsx` | `GET_ORDERS` from cache | ⚠️ Same |
| Market (restaurant list) | `app/(tabs)/restaurants.tsx` | `businesses` (no limit) | 🟡 MEDIUM |
| Market (products) | `app/(tabs)/market.tsx` | `products(businessId)` | 🟢 LOW |
| Admin screens (orders) | `app/admin/(tabs)/orders.tsx` | `ADMIN_GET_ORDERS` (no limit) | 🔴 HIGH |
| Admin screens (users) | `app/admin/users.tsx` | `ADMIN_GET_USERS` (no limit) | 🔴 HIGH |
| Admin screens (settlements) | `app/admin/settlements.tsx` | `ADMIN_GET_SETTLEMENTS` (no limit) | 🔴 HIGH |
| Admin screens (businesses) | `app/admin/businesses.tsx` | `ADMIN_GET_BUSINESSES` (no limit) | 🟡 MEDIUM |
| Admin screens (drivers) | `app/admin/drivers.tsx` | `ADMIN_GET_DRIVERS` (no limit) | 🟡 MEDIUM |

---

## 4. mobile-driver

**No `onEndReached` calls.** Settlement list now uses `fetchMore` with load-more button (`SETTLEMENT_PAGE_SIZE=20`).

| Screen | File | Query | Pagination |
|---|---|---|---|
| Order map | `app/(tabs)/map.tsx` | `GET_ORDERS` (no limit) → `findForDriver` — **no DB limit** | 🔴 HIGH — unbounded driver order query |
| Navigation | `app/(tabs)/navigation.tsx` | `GET_ORDERS` (no limit) | 🔴 HIGH — same |
| Settlements | `app/(tabs)/earnings.tsx` | `GET_MY_SETTLEMENTS` with `limit: 20`, `offset: 0` | ✅ **FIXED** — `SETTLEMENT_PAGE_SIZE=20`, `fetchMore` load-more button, offset tracking |
| Messages | `app/(tabs)/messages.tsx` | `MY_DRIVER_MESSAGES` with `limit: 100` hard-coded | ⚠️ Partial: hard cap 100, no load-more |

---

## 5. mobile-business

**No `onEndReached` calls.** Settlement list now uses `fetchMore` with load-more button (`PAGE_SIZE=20`).

| Screen | File | Query | Pagination |
|---|---|---|---|
| Orders (live) | `app/(tabs)/index.tsx` | `GET_BUSINESS_ORDERS` (no limit) | 🟡 MEDIUM — large businesses with 100s orders |
| Finances | `app/(tabs)/finances.tsx` | `GET_MY_BUSINESS_SETTLEMENTS` with `limit: 20`, `offset: 0` | ✅ **FIXED** — `PAGE_SIZE=20`, `fetchMore` load-more button, offset tracking |
| Settlement requests | `app/(tabs)/finances.tsx` | `GET_MY_SETTLEMENT_REQUESTS` with `limit: 20` | ⚠️ Only shows 20 requests |
| Settlement history | `app/settlement-history.tsx` | `GET_MY_SETTLEMENT_REQUESTS` with `limit: 200` | ⚠️ Hard cap 200 |
| Messages | `app/(tabs)/messages.tsx` | `MY_BUSINESS_MESSAGES` with `limit: 100` hard-coded | ⚠️ Partial |
| Products | `app/(tabs)/products.tsx` | `GET_BUSINESS_PRODUCTS` (no limit) | 🟢 LOW |

---

## 6. mobile-admin

**No `onEndReached` calls anywhere.** No `fetchMore`. No infinite scroll.

| Screen | File | Query | Pagination |
|---|---|---|---|
| Dashboard | `app/(tabs)/dashboard.tsx` | `GET_ORDERS` + `GET_DRIVERS` (no limit) | 🔴 HIGH |
| Map | `app/(tabs)/map.tsx` | `GET_ORDERS` + `GET_DRIVERS` (no limit) | 🔴 HIGH |
| Orders | `app/(tabs)/orders.tsx` | `GET_ORDERS` — `orders(limit: 200)` ✅ | ✅ **FIXED** — hardcoded `limit: 200` cap |
| Businesses | `app/businesses.tsx` | `GET_BUSINESSES` (no limit) | 🟡 MEDIUM |
| Drivers | `app/drivers.tsx` | `GET_DRIVERS` (no limit) | 🟡 MEDIUM |
| Users | `app/users.tsx` | `GET_USERS` — `users(limit: 500)` ✅ | ✅ **FIXED** — hardcoded `limit: 500` cap |
| Settlements | `app/settlements.tsx` | `GET_SETTLEMENTS` — `settlements(limit: 200)` ✅ | ✅ **FIXED** — `variables: { limit: 200 }` |
| Notifications | `app/notifications.tsx` | `GET_NOTIFICATION_CAMPAIGNS` (no limit) | 🟡 MEDIUM |

---

## 7. Risk Matrix & Priority

### 🔴 HIGH — Fix immediately or before scaling

| ID | Location | Issue | Status |
|---|---|---|---|
| H1 | API `Order` | `findForDriver()` has no `.limit()` call | ✅ **FIXED** — default limit=200 |
| H2 | API `Order` | `findByStatus()` has no `.limit()` — `ordersByStatus` + `cancelledOrders` queries | ✅ **FIXED** — default limit=500, offset=0 |
| H3 | API `User` | `getAllUsers()` no limit — `users` query fetches every user | ✅ **FIXED** — default limit=2000, offset=0 |
| H4 | API `Order` | `findAll(limit=500)` — admin order view is silently capped at 500 with no offset | ✅ **FIXED** — `limit`/`offset` now on schema and resolver |
| H5 | admin-panel orders | `GET_ORDERS` with no limit/offset — relies on API's 500 cap silently | ✅ **FIXED** — `GET_ORDERS` passes `$limit`/`$offset`; `useOrders` hook accepts options; `PAGE_SIZE=100`, prev/next pager UI on orders page |
| H6 | admin-panel admins page | `USERS_QUERY` fetches all users to browser | ✅ **FIXED** — `USERS_QUERY` passes `$limit`/`$offset`; `PAGE_SIZE=100`, prev/next pager UI on admins page |
| H7 | mobile-admin all list screens | All use unbounded queries — orders, users, settlements | ✅ **FIXED** — orders `limit: 200`, users `limit: 500`, settlements `limit: 200` hardcoded caps |
| H8 | API `getPromotionUsage` | No limit — popular promo could have 10k+ usages | ✅ **FIXED** — schema has `limit: Int, offset: Int`; resolver + service + repository all wired |

### 🟡 MEDIUM — Fix before wider launch

| ID | Location | Issue |
|---|---|---|
| M1 | API `Order` (CUSTOMER) | `findByUserId(limit=100)` — customer with >100 orders sees incomplete history | ✅ **FIXED** — `offset` added to `findByUserId`; `useOrders` hook in mobile-customer now exposes `loadMore`/`hasMore` + `fetchMore` with `PAGE_SIZE=30`; `OrderHistoryList` uses `onEndReached` |
| M2 | API `Order` (BUSINESS) | `getOrdersByBusinessId` — no limit on business order queries |
| M3 | admin-panel finances | `GET_SETTLEMENTS` with no limit in `page-new.tsx` | ✅ **FIXED** — `limit: 1000` safety cap added |
| M4 | admin-panel settlements page | Hard-coded `limit: 200` with no UI pager |
| M5 | mobile-business finances | `GET_MY_BUSINESS_SETTLEMENTS` with `limit: 20` | ✅ **FIXED** — `fetchMore` load-more with `PAGE_SIZE=20` |
| M6 | mobile-driver settlements | `GET_MY_SETTLEMENTS` with `limit: 20`, offset tracking | ✅ **FIXED** — `fetchMore` load-more with `SETTLEMENT_PAGE_SIZE=20` |
| M7 | API `businesses` | No limit on businesses query |
| M8 | API/mobile message threads | `businessMessageThreads` / `driverMessageThreads` — no pagination |

### 🟢 LOW — Track but not urgent

- All product/category queries (bounded per-business)
- `deliveryZones`, `deliveryPricingTiers`, `getBanners`, `settlementRules`
- `myAddresses`, `getUserPromotions`, `getApplicablePromotions`
- Message lists with hard cap 100 (messages.tsx in driver/business) — acceptable for a chat UI, but no older-message loading

---

## 8. What IS Fully Working

1. **Admin Audit Logs** (`admin-panel/src/app/dashboard/logs/page.tsx`) — full server-side pagination with `PAGE_SIZE=50`, page state, prev/next buttons, total count display.
2. **API `auditLogs` resolver + `AuditLogRepository`** — returns `{ logs, total }`, applies `.limit()` + `.offset()` at DB level.
3. **API `settlements` / `settlementPayments` / `settlementRequests` resolvers** — properly forward `limit`/`offset` to their repositories.
4. **API message resolvers** (`businessMessages`, `myBusinessMessages`, `driverMessages`, `myDriverMessages`) — apply `.limit()` + `.offset()` at DB level with sensible defaults.
5. **mobile-driver settlements** — sends `limit: 50` to API (partial — no infinite scroll, but bounded).
6. **mobile-business messages** — sends `limit: 100` to API (partial — no infinite scroll, but bounded).7. **API `orders` (all roles)** — `limit`/`offset` on schema and all resolver paths (ADMIN, DRIVER, CUSTOMER, BUSINESS hardcap).
8. **API `ordersByStatus` / `cancelledOrders`** — `limit`/`offset` on schema and resolvers.
9. **API `users`** — `limit`/`offset` on schema; default cap 2000.
10. **API `getPromotionUsage`** — `limit`/`offset` on schema; resolver + service + repository fully implemented with auth guard.
11. **Admin-panel orders page** — `PAGE_SIZE=100`, `ordersPage` state, prev/next pager UI, `useOrders` hook accepts options.
12. **Admin-panel admins page** — `PAGE_SIZE=100`, `usersPage` state, prev/next pager UI.
13. **Admin-panel finances** — `limit: 1000` safety cap on `GET_SETTLEMENTS`.
14. **mobile-admin orders** — `limit: 200` hardcoded.
15. **mobile-admin users** — `limit: 500` hardcoded.
16. **mobile-admin settlements** — `limit: 200` hardcoded.
17. **mobile-customer `OrderHistoryList`** — `PAGE_SIZE=30`, `fetchMore` on `onEndReached`, footer spinner, `hasMore` guard.
---

## 9. Partial Implementations (Args Defined, Clients Don't Use Them)

These queries have `limit`/`offset` in the schema but clients currently pass `undefined` (no args), getting all results:

| Query | Has schema args | Clients passing args |
|---|---|---|
| `settlements` | ✅ | `admin-panel/finances/page-new.tsx` — no args; `mobile-customer/admin/settlements.tsx` — no args; `mobile-admin/settlements.tsx` — no args |
| `businessMessages` | ✅ | Admin panel passes `limit`/`offset` ✅; check `business-messages/page.tsx` usage |
| `driverMessages` | ✅ | Admin panel passes `limit`/`offset` ✅ |
| `settlementRequests` | ✅ (default 50) | `mobile-business/settlement-history.tsx` passes `limit: 200`; `mobile-business/finances.tsx` passes `limit: 20` |
| `deviceTokens` | ⚠️ Schema `limit` arg ignored in resolver | Admin panel passes no limit arg anyway |

---

## 10. Recommended Fix Order

1. ~~**[H2]** Add `.limit()` to `OrderRepository.findByStatus()` and `findByStatus`-based queries; add `limit`/`offset` args to `ordersByStatus`, `cancelledOrders` schema + resolvers.~~ ✅ DONE
2. ~~**[H1]** Add `.limit()` to `OrderRepository.findForDriver()`.~~ ✅ DONE
3. ~~**[H3+H6]** Add `limit`/`offset` to `users` schema query; add safety cap to `authService.getAllUsers()`.~~ ✅ DONE
4. ~~**[H4+H5]** Expose `limit`/`offset` on the `orders` schema query + admin-panel `useOrders` hook + `GET_ORDERS` variables + orders page pager UI.~~ ✅ DONE
5. ~~**[H6]** Admin-panel admins page pager UI with `PAGE_SIZE=100`.~~ ✅ DONE
6. ~~**[H7]** Add hardcoded limit caps to mobile-admin list screens (orders 200, users 500, settlements 200).~~ ✅ DONE
7. ~~**[H8]** Add `limit`/`offset` to `getPromotionUsage` — schema, resolver, service, repository.~~ ✅ DONE
8. ~~**[M1]** Increase or expose `findByUserId` limit; add `fetchMore`/load-more to `OrderHistoryList` in mobile-customer.~~ ✅ DONE
9. ~~**[M3]** Fix admin finances `GET_SETTLEMENTS` — add `limit: 1000` safety cap.~~ ✅ DONE
10. **[M8]** Add pagination to `businessMessageThreads` / `driverMessageThreads`.
11. Long-term: consider migrating high-volume list queries to relay-style cursor connections.
