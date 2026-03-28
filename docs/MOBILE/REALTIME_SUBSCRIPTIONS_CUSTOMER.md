# Real-Time Subscriptions — mobile-customer Audit

<!-- MDS:M10 | Domain: Mobile | Updated: 2026-03-25 -->
<!-- Depends-On: A1, B1, B4, M7, BL3 -->
<!-- Depended-By: M1 -->
<!-- Nav: Subscription topology, connection count, payload sizing, optimization assessment. Update when subscription definitions, Apollo WS config, or PubSub architecture change. -->

## Purpose

Comprehensive audit of the real-time subscription system in `mobile-customer`, evaluating connection topology, payload efficiency, lifecycle management, and stability. Identifies concrete optimizations.

---

## 1. Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Transport | `graphql-ws` over WebSocket | Single persistent WS connection per client |
| Client | `@apollo/client` + `GraphQLWsLink` | Split-link: WS for subscriptions, HTTP for queries/mutations |
| Server | `graphql-yoga` + `graphql-ws` + `ws` | Express HTTP + WS upgrade on same port |
| PubSub | In-memory `createPubSub` + optional Redis bridge | Redis bridge enabled via `REDIS_PUBSUB_URL` for multi-instance |

**Key design choice:** All subscriptions share **one WebSocket connection** via `graphql-ws` multiplexing. The split link routes only `subscription` operations over WS; queries and mutations go over HTTP. This is the correct approach — there is NOT a separate connection per subscription.

---

## 2. Active Subscriptions in mobile-customer

### Customer-facing (regular user)

| # | Subscription | Hook / Pattern | Mount Point | Skip Condition | Active During |
|---|-------------|---------------|-------------|----------------|--------------|
| 1 | `userOrdersUpdated` | `useSubscription` in `useOrdersSubscription` | `_layout.tsx` (global) | `!isAuthenticated \|\| !userId` | Entire app session when logged in |
| 2 | `orderDriverLiveTracking(orderId)` | `useSubscription` in `OrderDetails.tsx` | Order details screen | `!orderId \|\| !isDeliveryPhase` | Only on order details during delivery |
| 3 | `storeStatusUpdated` | `subscribeToMore` in `useStoreStatusInit` | `_layout.tsx` only (singleton) | Never (always active) | Entire app session |

### Admin sections (embedded in mobile-customer app)

| # | Subscription | Hook / Pattern | Mount Point | Skip Condition |
|---|-------------|---------------|-------------|----------------|
| 4 | `allOrdersUpdated` | `useSubscription` in `useAdminOrdersSubscription` | `admin/(tabs)/_layout.tsx` (singleton) | Never |
| 5 | `driversUpdated` | `useSubscription` in `useAdminOrdersSubscription` | `admin/(tabs)/_layout.tsx` (singleton) | Never |

---

## 3. Connection Count Analysis

### Regular customer session

**Steady state: 1 WS connection, 2 active subscriptions**

| Subscription | Always? | Concurrent? |
|-------------|---------|-------------|
| `userOrdersUpdated` | Yes (while authenticated) | 1 instance via global hook |
| `storeStatusUpdated` | Yes | 1 instance (singleton in `_layout.tsx`) |
| `orderDriverLiveTracking` | Only on order detail screen during delivery | 0-1 |

**Peak (order detail during delivery): 1 WS connection, 3 subscription operations**

### Admin session (same user, admin tabs open)

**Peak: 1 WS connection, up to 5 subscription operations** — healthy.

---

## 4. Findings and Optimization Assessment

### F1 — ✅ RESOLVED: `useStoreStatus` singleton

**Was:** `useStoreStatus()` called in 3 places (`_layout.tsx`, `home.tsx`, `restaurants.tsx`), each creating duplicate `GET_STORE_STATUS` network queries and `STORE_STATUS_UPDATED` subscriptions.

**Fix:** Split into `useStoreStatusInit()` (query + subscription, mounted once in `_layout.tsx`) and `useStoreStatus()` (Zustand reader, zero network cost). Created `store/storeStatusStore.ts`.

**Result:** 3 → 1 subscription, 3 → 1 network query.

### F2 — ✅ RESOLVED: Singleton admin orders+drivers subscription

**Was:** Both `admin/map.tsx` and `admin/orders.tsx` independently subscribed to `ADMIN_ALL_ORDERS_SUBSCRIPTION` with duplicated throttled-refetch infrastructure. `admin/map.tsx` also had its own `driversUpdated` subscription.

**Fix:** Extracted `useAdminOrdersSubscription()` hook (mounted once in `admin/(tabs)/_layout.tsx`). Both tabs now just read from Apollo cache.

**Result:** 2 → 1 orders subscription, removed ~100 lines of duplicated throttle logic from both screens.

### F3 — LOW: `userOrdersUpdated` payload is oversized

The `USER_ORDERS_UPDATED` subscription payload includes **full business details** (working hours, location, imageUrl, isActive, isOpen, createdAt, updatedAt) and **full item details** (all selectedOptions with names/prices, nested childItems with their own options) for every order update.

**Payload estimate:** ~2-5 KB per order with items, sent on every status change.

**What's actually needed for real-time updates:**
- `id`, `status`, `updatedAt`, `estimatedReadyAt`, `preparingAt`
- `driver` (connection info, location)
- Price fields (rarely change after creation)

**Future consideration:** Consider a lightweight `orderStatusUpdated` for status-only updates and only fetch full order details on initial load.

### F4 — GOOD: `publishAllOrders` sends empty signal

`publishAllOrders()` publishes `{ orders: [] }` — a lightweight signal. Admin clients then decide how to update (cache merge or refetch). This is the correct pattern for broadcast topics with potentially large payloads.

### F5 — GOOD: WebSocket reconnection handling is solid

The reconnection architecture is well-designed:
- `retryAttempts: Infinity` with exponential backoff (1s → 2s → 5s → 10s cap)
- `keepAlive: 30000` prevents idle disconnects
- `wsReconnectListeners` pattern ensures data sync after reconnect
- `closeAndReconnectWs()` handles auth token refresh edge case
- User-facing toast on connection loss/restore (good UX)

### F6 — GOOD: Server-side rate limiting exists

- Max 20 subscriptions per WebSocket connection
- Max 35 subscribe operations per 10-second window
- These protect against runaway subscription storms

### F7 — GOOD: Per-user topic scoping

`userOrdersUpdated` uses per-user PubSub topics (`orders.byUser.changed.${userId}`), so user A never receives user B's order data. This is correct both for security and for minimizing unnecessary payload delivery.

### F8 — INFO: `storeStatusUpdated` is a broadcast topic

`storeStatusChanged()` publishes to ALL connected clients. For a small-medium user base this is fine. At scale (thousands of concurrent WS connections), a store status change would fan out to every client simultaneously.

### F9 — ✅ RESOLVED: Delta publish instead of full snapshot

**Was:** `publishUserOrders(userId)` re-queried ALL uncompleted orders from DB, fully mapped each one, then published the entire array — even when only 1 order changed.

**Fix:**
- **Server:** Added `publishSingleUserOrder(userId, orderId)` that fetches+maps only the changed order and publishes `[singleOrder]`. All 7 mutation callers switched to use it.
- **Client:** Changed `applyRealtimeOrdersSnapshot` from full-replace to merge-by-id — incoming orders are merged into existing cache, not replacing the whole list. Zustand store updated per-order instead of bulk `setActiveOrders`.

**Result:** DB load per publish: O(N orders × M items) → O(1 order × M items). The original `publishUserOrders` is kept for any future full-snapshot needs.

### F10 — Startup GraphQL compatibility guard

The app bootstrap paths (`GetOrders`, `GetOrdersByStatus`, `UserOrdersUpdated`) avoid optional lifecycle fields that are not guaranteed on every deployed API schema variant.

Current rule for startup safety:
- Keep these startup documents on the conservative, widely-supported order field set.
- Restrict richer lifecycle fields to detail-oriented flows (`GetOrder`) where needed.

This keeps app launch resilient when mobile bundles and API deployments are temporarily out of sync.

---

## 5. Stability Assessment

### What's working well

| Area | Status | Details |
|------|--------|---------|
| Connection multiplexing | ✅ Optimal | Single WS, multiplexed subscriptions via `graphql-ws` |
| Auth on reconnect | ✅ Solid | Token refresh → force WS reconnect → `connectionParams` re-run |
| Fallback recovery | ✅ Good | `useOrdersSubscription` has throttled fallback refetch on error/reconnect |
| Topic scoping | ✅ Correct | Per-user topics prevent data leakage and reduce noise |
| Skip logic | ✅ Good | Live tracking only active during delivery phase |
| Server guards | ✅ Good | Rate limiting on subscription ops, role-based resolver auth |
| Lazy connection | ✅ Correct | `lazy: true` — WS only connects when first subscription mounts |
| Startup schema compatibility | ✅ Guarded | Startup order docs use conservative field set to reduce schema drift crashes |

### What could be improved

| Area | Priority | Effort | Impact |
|------|----------|--------|--------|
| ~~Deduplicate `useStoreStatus` (F1)~~ | ✅ Done | — | −2 subscription ops, −2 network queries |
| ~~Deduplicate admin `allOrdersUpdated` (F2)~~ | ✅ Done | — | −1 subscription op, cleaner cache writes |
| Slim `userOrdersUpdated` payload (F3) | Low | Medium | Smaller WS messages per update |
| ~~Delta vs. snapshot publish (F9)~~ | ✅ Done | — | O(1) DB load per order mutation |

---

## 6. Recommended Optimization Roadmap

### Phase 1: Quick wins — ✅ COMPLETED

1. ~~**Singleton `useStoreStatus`**~~ — Done. Split into `useStoreStatusInit()` (in `_layout.tsx`) + `useStoreStatus()` (Zustand reader). Created `store/storeStatusStore.ts`.

2. ~~**Singleton admin orders subscription**~~ — Done. Extracted `useAdminOrdersSubscription()` hook in `admin/(tabs)/_layout.tsx`. Both tabs read from shared Apollo cache.

3. ~~**Delta publish**~~ — Done. Added `publishSingleUserOrder(userId, orderId)` on server. Client `applyRealtimeOrdersSnapshot` now merges by ID. All 7 mutation callers updated.

### Phase 2: Payload optimization (medium effort)

4. **Lightweight order subscription payload** — Create a `UserOrderStatusUpdated` subscription with minimal fields: `{ id, status, updatedAt, estimatedReadyAt, preparingAt, driver { id, driverLocation, driverConnection } }`. Use the existing full `GET_ORDER` query for detail views.

### Phase 3: Scalability (future)

5. **Store status fan-out control** — If concurrent users grow past hundreds, consider using a polling fallback for store status (every 30-60s) instead of a broadcast subscription.

6. **Subscription-aware AppState** — Pause subscriptions (via `skip`) when app goes to background (React Native `AppState`). Re-subscribe and force-refresh on foreground. Avoids maintaining WS connections for backgrounded apps.

---

## 7. Connection Topology Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    mobile-customer app                       │
│                                                              │
│  _layout.tsx (always mounted)                                │
│  ├── useOrdersSubscription()                                 │
│  │   └── WS: userOrdersUpdated          ─┐                  │
│  ├── useStoreStatusInit()  [SINGLETON]    │                  │
│  │   └── WS: storeStatusUpdated    ──────┐│                  │
│  │                                       ││                  │
│  ├── home.tsx                            ││                  │
│  │   └── useStoreStatus() [Zustand read] ││ Single WS conn  │
│  ├── restaurants.tsx                     ││ (multiplexed)    │
│  │   └── useStoreStatus() [Zustand read] ┘│                  │
│  │                                        │                  │
│  └── OrderDetails.tsx (conditional)       │                  │
│      └── WS: orderDriverLiveTracking   ──┘                  │
│                                                              │
│  admin/(tabs)/_layout.tsx (admin only)                       │
│  ├── useAdminOrdersSubscription() [SINGLETON]                │
│  │   ├── WS: allOrdersUpdated          ──┐                  │
│  │   └── WS: driversUpdated             ─┤ Same WS conn     │
│  admin/map.tsx  → reads from Apollo cache ┤                  │
│  admin/orders.tsx → reads from Apollo cache┘                 │
└──────────────────────────────────────────────────────────────┘
                         │
                    Single WSS
                    connection
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     API Server                               │
│                                                              │
│  graphql-ws (ws library)                                     │
│  ├── Rate limit: 20 subs/socket, 35 ops/10s window          │
│  ├── Auth: connectionParams → JWT decode                     │
│  └── Per-subscription resolver auth + role check             │
│                                                              │
│  PubSub (in-memory + Redis bridge)                           │
│  ├── Per-user topics: orders.byUser.changed.{userId}         │
│  ├── Per-order topics: order.driver.live.changed.{orderId}   │
│  ├── Broadcast: store.status.changed, drivers.all.changed    │
│  └── Redis bridge: delivery:graphql:pubsub:v1                │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Files Involved

### Client-side (mobile-customer)

| File | Role |
|------|------|
| `lib/graphql/apolloClient.ts` | WS link, split link, reconnection, auth error handling |
| `modules/orders/hooks/useOrdersSubscription.ts` | Primary order subscription + cache/store sync |
| `modules/orders/components/OrderDetails.tsx` | Live driver tracking subscription |
| `hooks/useStoreStatus.ts` | Store status init (single subscription) + Zustand reader |
| `store/storeStatusStore.ts` | Zustand store for singleton store status state |
| `hooks/useAdminOrdersSubscription.ts` | Singleton admin orders+drivers subscription hook |
| `graphql/operations/orders/subscriptions.ts` | All order subscription documents |
| `graphql/operations/store.ts` | Store status subscription document |
| `graphql/operations/admin/orders.ts` | Admin orders subscription document |
| `graphql/operations/admin/drivers.ts` | Admin drivers subscription document |
| `app/admin/(tabs)/_layout.tsx` | Admin tabs layout — mounts singleton admin subscription |
| `app/admin/(tabs)/map.tsx` | Admin map — reads from shared Apollo cache |
| `app/admin/(tabs)/orders.tsx` | Admin orders — reads from shared Apollo cache |

### Server-side (api)

| File | Role |
|------|------|
| `src/lib/pubsub.ts` | PubSub instance, topics, Redis bridge |
| `src/index.ts` | WS server setup, rate limiting, connection auth |
| `src/services/OrderService.ts` | `publishSingleUserOrder` (delta), `publishUserOrders` (fallback full snapshot), `publishAllOrders`, subscribe helpers |
| `src/services/DriverHeartbeatHandler.ts` | High-frequency live tracking publishes |
| `src/models/Order/resolvers/Subscription/` | All order subscription resolvers |
| `src/models/General/resolvers/Subscription/storeStatusUpdated.ts` | Store status resolver |

---

## 9. Change Safety Checklist

When modifying subscriptions:

1. Verify subscription count doesn't exceed server limit (20/socket).
2. Ensure `skip` conditions prevent subscriptions when data isn't needed.
3. Test reconnection: kill WS → verify reconnect + data resync + toast notification.
4. Check that subscription payload matches cache shape (or fallback refetch fires).
5. For new broadcast subscriptions, assess fan-out impact at target user scale.
6. Run codegen after schema changes to keep typed document nodes aligned.
7. Verify `_layout.tsx` global hooks don't duplicate with screen-level hooks.

---

## 10. Live Activity ETA Source (Current State)

For `OUT_FOR_DELIVERY`, customer Live Activity state is derived in `useBackgroundLiveActivity` with this priority:

1. Driver live ETA from `driver.driverConnection.remainingEtaSeconds` when `navigationPhase === 'to_dropoff'` and `activeOrderId` matches the order.
2. Fallback inferred countdown anchored from `outForDeliveryAt` (not `updatedAt`) when live ETA is not yet available.

The out-for-delivery branch must not use a fixed `15` minute value as the primary source, otherwise foreground/background sync can pin Dynamic Island ETA to 15 and overwrite backend minute updates.
