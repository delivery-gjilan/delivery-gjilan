# Mobile Driver App

<!-- MDS:M8 | Domain: Mobile | Updated: 2026-03-28 -->
<!-- Depends-On: A1, B1, B4, B5, B7, BL1 -->
<!-- Depended-By: M1, O4 -->
<!-- Nav: Heartbeat changes → also update B4 (Watchdog). Auth changes → also update B5. Subscription shape changes → verify map.tsx and navigation.tsx cache update logic. -->

## Purpose

`mobile-driver` is the **live data producer** for the entire delivery system. It is the only client that writes GPS location, heartbeat presence, navigation ETA, and battery state to the backend. Every other client (admin dashboard, customer app, business app) reads driver state — this app writes it.

Any regression in heartbeat reliability or navigation status reporting directly degrades customer delivery tracking and admin map accuracy.

---

## App Structure

```
mobile-driver/
├── app/
│   ├── _layout.tsx             # Root layout, Mapbox init, Providers wrapper
│   ├── login.tsx               # Login screen
│   ├── navigation.tsx          # Full-screen navigation modal (MapboxNavigationView)
│   └── (tabs)/
│       ├── _layout.tsx         # Tab bar with logout button
│       ├── home.tsx            # Online/offline toggle
│       ├── map.tsx             # Live order map with Mapbox
│       ├── add.tsx             # Earnings & settlements
│       ├── messages.tsx        # Driver ↔ Admin chat, persisted to AsyncStorage
│       └── profile.tsx         # User info, language toggle
├── components/
│   ├── navigation/             # FloatingMapButtons, InstructionBanner, NavigationBottomPanel, RecenterButton
│   ├── Badge, Button, Card, DateTimePicker, InfoBanner, Input, TrendIndicator
├── graphql/operations/
│   ├── auth/login.ts           # LOGIN_MUTATION (generic, role-checked)
│   ├── auth/driverLogin.ts     # DRIVER_LOGIN_MUTATION — dead code, not imported anywhere
│   ├── driver.ts               # GET_MY_DRIVER_METRICS, GET_MY_SETTLEMENTS, GET_MY_SETTLEMENT_SUMMARY
│   ├── driverLocation.ts       # UPDATE_DRIVER_ONLINE_STATUS
│   ├── driverTelemetry.ts      # DRIVER_UPDATE_BATTERY_STATUS, DRIVER_PTT_SIGNAL_SUBSCRIPTION, GET_AGORA_RTC_CREDENTIALS
│   ├── notifications.ts        # REGISTER_DEVICE_TOKEN, UNREGISTER_DEVICE_TOKEN, TRACK_PUSH_TELEMETRY
│   ├── orders.ts               # GET_ORDERS, GET_ORDER, ASSIGN_DRIVER_TO_ORDER, UPDATE_ORDER_STATUS, DRIVER_NOTIFY_CUSTOMER, ALL_ORDERS_UPDATED
│   └── store.ts                # GET_STORE_STATUS
├── hooks/                      # All hooks (see Hooks Inventory below)
├── lib/graphql/
│   ├── apolloClient.ts         # Apollo setup, cache, WS client
│   ├── authSession.ts          # JWT validation, token refresh, refresh dedup lock
│   ├── providers.tsx           # ApolloProvider + ThemeProvider + SafeAreaProvider
│   └── driverSocket.ts         # Empty file — dead code
├── store/
│   ├── authStore.ts            # Auth state + online preference (Zustand persist)
│   ├── navigationStore.ts      # Active navigation state machine (Zustand)
│   ├── navigationLocationStore.ts   # SDK location feed → heartbeat bridge
│   ├── driverLocationOverrideStore.ts  # Simulation override
│   ├── useLocaleStore.ts       # Language preference
│   └── useThemeStore.ts        # Theme preference
├── utils/
│   ├── mapbox.ts               # Directions API calls, route cache (TTL 5–10 min), in-flight dedup
│   ├── routeProgress.ts        # Haversine ETA computation (no API calls)
│   ├── secureTokenStore.ts     # SecureStore (native) / AsyncStorage (web) token persistence
│   ├── environment.ts          # Environment enum
│   ├── constants.ts            # DEV_ENV, PROD_ENV
│   └── types.ts                # Shared types
└── localization/
    ├── en.json / al.json       # Translation strings
    ├── schema.ts               # Zod-enforced translation shape
    └── validate.ts             # Prestart validation script
```

---

## Startup Sequence

```
index.tsx
  └── _layout.tsx (RootLayout)
       ├── useAppSetup()
       │    ├── useSyncTheme()      → reads useThemeStore, applies system theme
       │    └── useInitializeTranslation() → loads locale from useLocaleStore
       ├── Mapbox.setAccessToken(MAPBOX_TOKEN)   [EXPO_PUBLIC_MAPBOX_TOKEN]
       └── <Providers>
            ├── apollo3-cache-persist restores InMemoryCache from AsyncStorage
            │    └── 2s timeout guard if restore hangs
            ├── ApolloProvider
            ├── ThemeProvider (@react-navigation/native)
            └── <AppContent>
                 ├── useDriverTracking()   → heartbeat + battery reporting
                 ├── useNotifications()    → FCM token registration
                 ├── useDriverPttReceiver() → Agora RTC PTT listener
                 ├── useStoreStatus()      → GET_STORE_STATUS poll (30s)
                 ├── useGlobalOrderAccept() → single ALL_ORDERS_UPDATED subscription + OrderAcceptSheet
                 └── <Stack> screens
```

---

## Authentication Flow

### Login

1. `login.tsx` calls `useAuth().login(email, password)`
2. `useAuth` fires `LOGIN_MUTATION` — the generic `login` mutation, NOT `driverLogin`
3. Response token is validated: `user.role` must be `UserRole.Driver` — non-driver logins are rejected client-side
4. Tokens saved: `saveToken()` → `expo-secure-store` (native) / `AsyncStorage` (web)
5. `authStore.login(token, user)` updates Zustand state; `isOnline` is seeded from `user.driverConnection.onlinePreference`
6. Router replaces to `/(tabs)/home`

### Token Refresh (`lib/graphql/authSession.ts`)

- `getValidAccessToken(minValidityMs)` is called by the Apollo `authLink` on every HTTP request and by the background heartbeat before each fetch
- Parses JWT `exp` claim from Base64 payload without a library
- If token expires within 60 s, calls `refreshAccessToken()` using `refreshToken` mutation
- Deduplication: a single `refreshInFlight` promise is shared so concurrent callers don't fire multiple refresh requests
- On refresh failure the old token is returned as fallback (no forced logout)

### Auth Store

`authStore.ts` persists to AsyncStorage under key `driver-auth-storage`. Fields:

| Field | Type | Description |
|-------|------|-------------|
| `token` | `string \| null` | Access JWT |
| `user` | `User \| null` | Full user object inc. `driverConnection` |
| `isAuthenticated` | `boolean` | `!!(token && user && role === DRIVER)` |
| `isOnline` | `boolean` | Driver's manual preference toggle (≠ backend's `connectionStatus`) |
| `isLoading` | `boolean` | Request in-flight |
| `hasHydrated` | `boolean` | Zustand persist hydration gate |

**Important distinction**: `isOnline` is the driver's intent ("I want to work"). The backend's `connectionStatus` (CONNECTED/STALE/LOST/DISCONNECTED) is the system's computed presence based on heartbeat recency.

---

## Apollo Client (`lib/graphql/apolloClient.ts`)

### Transport

- HTTP queries/mutations route through `authLink → httpLink` using `EXPO_PUBLIC_API_URL`
- Subscriptions route through `wsLink` (graphql-ws) using the same URL with `http` → `ws` scheme swap
- Link split is on `OperationDefinition.operation === 'subscription'`

### WebSocket

```
createClient({
  url: wsUrl,
  connectionParams: async () => ({ Authorization: `Bearer ${token}` }),
  shouldRetry: () => true,
  retryAttempts: Infinity,
  retryWait: exponentialBackoff([0.5s, 1s, 2s, 5s]),
  keepAlive: 30_000,
  lazy: true,   ← only connects when first subscription is registered
})
```

The reconnect ladder is intentionally front-loaded so drivers returning from background recover realtime subscriptions faster before falling back to longer waits.

### Cache Policies

```ts
typePolicies: {
  Order:       { keyFields: ['id'], fields: { businesses: { merge: false } } },
  Business:    { keyFields: ['id'], fields: { products:   { merge: false } } },
  Product:     { keyFields: ['id'] },
  User:        { keyFields: ['id'] },
  Driver:      { keyFields: ['id'] },
  Settlement:  { keyFields: ['id'] },
  UserAddress: { keyFields: ['id'] },
}
```

The `Query.order` field has a local-only read resolver that resolves individual orders from the `GET_ORDERS` cache without a round-trip.

### Persistence

`apollo3-cache-persist` serializes the InMemoryCache to AsyncStorage. On cold start, the cached data is available before the first network response, eliminating skeleton flash. A 2s timeout in `providers.tsx` ensures startup never hangs if the cache is corrupt or AsyncStorage is slow.

### Error Handling

The `errorLink` logs `UNAUTHENTICATED` errors and 401 network errors but does **not** force logout. This was a deliberate choice to avoid disrupting drivers mid-delivery due to temporary auth issues.

---

## Driver Tracking System

### Overview

```
useDriverTracking()
  ├── useDriverHeartbeat()
  └── useDriverBatteryReporting()
```

Both hooks are started unconditionally when `AppContent` mounts and gate themselves on `isAuthenticated`.

### Heartbeat (`hooks/useDriverHeartbeat.ts`)

The heartbeat is the most critical operation in the app. It keeps the backend watchdog satisfied and pushes the driver's location to the system.

**Mutation:**
```graphql
mutation DriverHeartbeat(
  $latitude: Float!
  $longitude: Float!
  $activeOrderId: ID
  $navigationPhase: String
  $remainingEtaSeconds: Int
) {
  driverHeartbeat(...) {
    success
    connectionStatus
    locationUpdated
    lastHeartbeatAt
  }
}
```

**Timing:**
- Default: every **5 seconds** in foreground
- Active delivery (status `OUT_FOR_DELIVERY`): every **2 seconds**
- Interval is re-evaluated on each tick by reading `navigationStore` state directly (avoids stale closures)

**Location source priority:**
1. `navigationLocationStore` — live feed from `MapboxNavigationView` SDK (when navigating)
2. `expo-location` foreground watcher — polled when not navigating

**Navigation ETA payload:** When `navigationStore.isNavigating` is true and `durationRemainingS` is available, the heartbeat includes `activeOrderId`, `navigationPhase`, and `remainingEtaSeconds`. This powers customer-facing ETA display and triggers periodic Live Activity updates on the customer's Dynamic Island (throttled to one push per ~90 s via `DriverHeartbeatHandler`, see M3).

**Background heartbeat:**
- Uses `expo-task-manager` to register a background location task (`driver-heartbeat-background-task`)
- When app goes to background, `Location.startLocationUpdatesAsync` is used to receive location callbacks
- Each callback fires `sendBackgroundHeartbeat()` — a raw `fetch` POST (not Apollo) because Apollo may be suspended in background
- Requires `backgroundPermission` grant
- Shows Android foreground service notification: "Driver tracking active"

**AppState handling:** The interval is paused when app moves to background (background task takes over) and restored when returning to foreground.

### Battery Reporting (`hooks/useDriverBatteryReporting.ts`)

- Reports every **5 minutes** while authenticated
- Uses `expo-battery` for level (0–1 → 0–100) and charging state
- Mutation: `driverUpdateBatteryStatus(level, optIn, isCharging)`
- `optIn: true` is hardcoded — the driver always opts in

---

## Online Status

The home screen (`app/(tabs)/home.tsx`) presents an online/offline toggle.

**Flow:**
1. Driver toggles the switch
2. Optimistic update: `authStore.setOnline(newStatus)` fires immediately
3. `updateDriverOnlineStatus(isOnline)` mutation fires
4. Response updates `authStore.setUser()` with fresh `driverConnection` data
5. On error: optimistic update is rolled back and an Alert is shown

The backend uses `isOnline` to determine whether a driver should receive new order assignments.

---

## Map Screen (`app/(tabs)/map.tsx`)

The map is the primary operational view. It shows all active/available orders and the driver's live location.

**Data layer:**
- `GET_ORDERS` query (`cache-and-network` → `cache-first`)
- `ALL_ORDERS_UPDATED` subscription runs once globally in `useGlobalOrderAccept` (mounted in `AppContent`), merging payloads into the Apollo cache so all active `GET_ORDERS` queries auto-update
- If subscription payload is empty, the global hook falls back to `refetch()`

**Order filtering:**
- `assignedOrders`: `order.driver.id === currentDriverId` AND not `DELIVERED`/`CANCELLED`
- `availableOrders`: `order.status === 'READY'` AND no driver assigned
- Together these form `allMapOrders` rendered as map annotations

**GPS:**
- `useDriverLocation` with adaptive interval: 1s and 5m filter when active navigation detected, 5s and 10m otherwise
- `hasActiveNavigation` is derived from whether any assigned order has status `READY` or `OUT_FOR_DELIVERY`

**Route preview:**
- On marker tap → Mapbox Directions API call via `fetchRouteGeometry()`
- Preview route rendered as GeoJSON `LineString` on the map
- Focused order shows route info card (distance km, duration min)

**Navigation launch:**
- Driver taps "Start Navigation" on an assigned `READY` order
- `navigationStore.startNavigation(order, 'to_pickup', currentLocation)` is called
- Router pushes to `navigation` screen (full-screen modal)

**Dispatch mode gating:**
When `dispatchModeEnabled` is `true` (broadcast via `storeStatusUpdated` subscription, exposed by `useStoreStatus`):
- `availableOrders` useMemo returns `[]` — unassigned orders are hidden from the map
- The global `useGlobalOrderAccept` hook suppresses auto-present
- An amber “Admin is dispatching orders” pill appears on the home screen

**Order accept sheet:**
The `OrderAcceptSheet` is rendered globally in `AppContent` (`_layout.tsx`), not in map.tsx or navigation.tsx. When a driver selects an order from the pool FAB, `map.tsx` calls `useOrderAcceptStore.getState().setPendingOrder(order, false)` directly. Camera-fit runs in a local `useEffect` in `map.tsx` watching `pendingOrder?.id`.

---

## Navigation Screen (`app/navigation.tsx`)

The navigation screen uses `@badatgil/expo-mapbox-navigation` (wraps the native Mapbox Navigation SDK). Voice guidance is muted (`mute={true}` hardcoded).

### Two-Phase Navigation

```
phase: 'to_pickup'  →  driver navigates to business pickup location
        │
        ▼  (driver taps "Picked Up" → UPDATE_ORDER_STATUS to OUT_FOR_DELIVERY)
phase: 'to_dropoff' →  driver navigates to customer drop-off location
        │
        ▼  (driver taps "Delivered" → UPDATE_ORDER_STATUS to DELIVERED)
```

The `navigationStore.advanceToDropoff()` action transitions the phase. `stopNavigation()` clears all state.

### Overlays (all `position: absolute`)

| Layer | zIndex | Description |
|-------|--------|-------------|
| Floating bottom bar | 100 | Status colour, phase label, distance, ETA, exit button |
| Recenter button | 50 | Right side — calls `mapViewRef.current?.recenterMap()` |
| New order toast | 150 | Compact navy banner (top of screen) — appears when a new order is assigned while navigating; auto-dismisses after 6 s |
| Avatar sidebar | 50 | Discord-style order switcher — only visible when `assignedOrders.length > 1` |
| Pickup arrival panel | 200 | Slides from bottom on `onWaypointArrival` — "Picked Up" CTA |
| Delivery arrival panel | 200 | Slides from bottom on `onFinalDestinationArrival` — "Confirm Delivery" CTA |

### New Order Toast

When a new order is assigned to the driver during active navigation (dispatch mode scenario), a compact toast appears at the top of the screen:

- Detected by comparing `assignedOrders` IDs against `prevOrderIdsRef` between renders
- Auto-dismisses after **6 seconds** via `toastTimerRef`
- Timer is cleared on unmount to prevent state updates on unmounted component
- The avatar sidebar is the action surface — tap an avatar to switch navigation target to the new order

### Real-time Subscription

The navigation screen does not maintain its own `ALL_ORDERS_UPDATED` subscription. The single global subscription in `useGlobalOrderAccept` (mounted at `AppContent`) keeps the Apollo cache updated; `navigation.tsx` reads from the cache via its own `GET_ORDERS` query with `cache-and-network`.

### Heartbeat Integration

`navigationLocationStore` is filled by a `<MapboxNavigationView>` location callback:
```ts
onLocationChange({ coords }) {
  setNavigationLocation({ latitude, longitude });
}
```
The heartbeat hook reads this store first, so when navigating there is no duplicate GPS polling from `expo-location`.

### Status Updates

Both phase transitions fire `UPDATE_ORDER_STATUS` mutation:
- "Picked Up" → status `OUT_FOR_DELIVERY`
- "Delivered" → status `DELIVERED`

After delivery, `DRIVER_NOTIFY_CUSTOMER` mutation fires with `kind: DELIVERED` to push a notification to the customer.

### Navigation Hooks (prepared but not yet integrated)

These hooks exist in `hooks/` and are exported from `hooks/index.ts` but are **not used** by `navigation.tsx` or `map.tsx`:

| Hook | Purpose | Status |
|------|---------|--------|
| `useNavigationRoute` | Fetch and cache Mapbox routes, reroute policy (cap 3) | Unused |
| `useNavigationCamera` | Camera follow modes (free/heading-up/north-up) | Type imported by `FloatingMapButtons` only |
| `useNavigationSteps` | Turn-by-turn step management | Unused |
| `useOffRouteDetection` | Haversine-based off-route detection | Unused |
| `useSmoothCameraTracking` | Predicted camera position (interpolation) | Unused |
| `useNavigationSimulation` | GPS simulation along a polyline for testing | Unused |
| `usePredictedTracking` | GPS prediction for smooth marker/camera movement | Unused |
| `useNavigationState` | Local state machine (`idle/navigating/arrived`) | Unused (navigationStore covers this) |

These hooks were built for a custom `@rnmapbox/maps` navigation view and remain ready for a potential refactor away from the `@badatgil/expo-mapbox-navigation` SDK.

---

## Push-to-Talk (PTT)

The driver can receive real-time voice broadcasts from admin via **Agora RTC**.

**Flow:**
1. `useDriverPttReceiver` subscribes to `DRIVER_PTT_SIGNAL_SUBSCRIPTION(driverId)`
2. Subscription payload: `{ channelName, action, muted, driverId, adminId }`
3. On `action: JOIN/SPEAK`: lazy-loads `react-native-agora`, creates engine, fetches `getAgoraRtcCredentials(channelName, AUDIENCE)`, joins channel
4. On `onUserJoined` RTC event → `isAdminTalking = true` → red "Admin is talking" banner appears
5. On `onUserOffline` → `isAdminTalking = false` → banner disappears
6. Engine is reused across channels (audio re-enabled on reconnect to handle OS suspensions)

**Concurrency guard:** `joiningRef.current` prevents double-join races.

---

## Push Notifications (`hooks/useNotifications.ts`)

- Platform: Firebase Messaging + `expo-notifications` for foreground behavior
- Foreground notifications shown with alert + sound + badge
- On iOS: APNs token fetched via `getAPNSTokenAsync()` first, then FCM registration
- Device token registered with `REGISTER_DEVICE_TOKEN(input: { token, platform, appType: 'DRIVER', deviceId })`
- On logout: `UNREGISTER_DEVICE_TOKEN(token)` fires
- Background tap: notification data is inspected for `data.orderId` or `data.screen`; the app performs a `GET_ORDERS` network fetch (bounded to ~1.5s) before routing so order status/ETA is current on open
- Cold-start open path also consumes `getLastNotificationResponseAsync()` so launch-from-push follows the same refresh-first behavior
- All lifecycle events emit `TRACK_PUSH_TELEMETRY`: `TOKEN_REGISTERED`, `TOKEN_REFRESHED`, `TOKEN_UNREGISTERED`, `RECEIVED`, `OPENED`

---

## Messages Screen (`app/(tabs)/messages.tsx`)

Driver ↔ Admin real-time chat screen.

**Queries:**
- `MY_DRIVER_MESSAGES(limit: 100)` — initial load of server-stored messages.

**Subscriptions:**
- `DRIVER_MESSAGE_RECEIVED` — incoming messages from admin arrive in real-time.

**Persistence model:**
- Server messages arrive from the query/subscription.
- Outbound admin replies generated directly in this app (`extraMessages`) are persisted to AsyncStorage under key `driver_chat_extra_messages`.
- On mount, both `clearedAt` (timestamp) and `extraMessages` are restored from AsyncStorage — messages sent before `clearedAt` are filtered out.
- The "Clear" action wipes both `clearedAt` and `extraMessages` from AsyncStorage simultaneously, ensuring the cleared state survives navigation and app restart.
- Without persistence, clearing and navigating away would restore the full message list on re-mount.

---

## Earnings Screen (`app/(tabs)/add.tsx`)

Displays driver settlement history and summary.

**Period selector:** This Week / This Month / Last Month / All Time
- Dates computed client-side using `date-fns` (no timezone normalization — city-local context)

**Queries:**
- `GET_MY_SETTLEMENT_SUMMARY(startDate, endDate)` → totals panel
- `GET_MY_SETTLEMENTS(startDate, endDate, limit: 50)` → itemized list

Both use `fetchPolicy: 'network-only'` (pull-to-refresh semantics). Manual `RefreshControl` triggers `Promise.all([refetchSummary(), refetchSettlements()])`.

**No subscriptions** — earnings are not realtime; they change when admin settles.

---

## Store Status

`useStoreStatus()` polls `GET_STORE_STATUS` every **30 seconds** and subscribes to `STORE_STATUS_UPDATED` for real-time updates. The hook exposes:

| Field | Type | Description |
|-------|------|-------------|
| `isOpen` | `boolean` | Store open/closed state |
| `bannerEnabled` | `boolean` | Whether the info banner is shown |
| `bannerMessage` | `string \| null` | Banner text |
| `dispatchModeEnabled` | `boolean` | When `true`, admin is manually dispatching all new orders; drivers wait for silent-push assignments |
| `loading` | `boolean` | Initial query in-flight |

The `InfoBanner` component at the root of `AppContent` shows the banner when `bannerEnabled && bannerMessage`. Drivers can dismiss banners (local state, not persisted).

When `dispatchModeEnabled` is `true` and the driver is online, an amber pill is shown on the home screen: **"Admin is dispatching orders — wait for assignment."**

---

## GraphQL Operations Reference

### Mutations

| Mutation | File | When Used |
|----------|------|-----------|
| `login` | `auth/login.ts` | Login screen |
| `refreshToken` | `authSession.ts` (raw fetch) | Token expiry |
| `driverHeartbeat` | `useDriverHeartbeat` (inline gql) | Every 2–5s |
| `updateDriverOnlineStatus` | `driverLocation.ts` | Home toggle |
| `driverUpdateBatteryStatus` | `driverTelemetry.ts` | Every 5 min |
| `assignDriverToOrder` | `orders.ts` | Map screen order assign |
| `updateOrderStatus` | `orders.ts` | Navigation phase transitions |
| `driverNotifyCustomer` | `orders.ts` | Post-delivery notification |
| `registerDeviceToken` | `notifications.ts` | App start / token refresh |
| `unregisterDeviceToken` | `notifications.ts` | Logout |
| `trackPushTelemetry` | `notifications.ts` | All push lifecycle events |

### Queries

| Query | File | Where Used |
|-------|------|-----------|
| `orders` | `orders.ts` | map.tsx, navigation.tsx |
| `order(id)` | `orders.ts` | Individual order view (via cache read) |
| `myDriverMetrics` | `driver.ts` | (available, not currently wired to a screen) |
| `settlements` | `driver.ts` | Earnings screen |
| `settlementSummary` | `driver.ts` | Earnings screen |
| `getStoreStatus` | `store.ts` | `useStoreStatus` (30s poll) |
| `getAgoraRtcCredentials` | `driverTelemetry.ts` | PTT channel join |

### Subscriptions

| Subscription | File | Where Used |
|--------------|------|-----------|
| `allOrdersUpdated` | `orders.ts` | `useGlobalOrderAccept` only (single global instance in `AppContent`); includes `estimatedReadyAt` for cache parity with `GET_ORDERS` |
| `storeStatusUpdated` | `store.ts` | `useStoreStatus` (real-time dispatch mode + banner updates) |
| `driverPttSignal(driverId)` | `driverTelemetry.ts` | `useDriverPttReceiver` |

`useGlobalOrderAccept` also refetches `GET_ORDERS` on app foreground and on active session attach, with a short throttle guard, to backfill any events missed while backgrounded.

---

## Zustand Stores

| Store | Persisted | Key State |
|-------|-----------|-----------|
| `authStore` | Yes (AsyncStorage) | `token`, `user`, `isAuthenticated`, `isOnline` |
| `navigationStore` | No | `isNavigating`, `phase`, `order`, `destination`, `durationRemainingS` |
| `navigationLocationStore` | No | SDK location feed, freshness check (10s max age) || `orderAcceptStore` | No | `pendingOrder`, `autoCountdown`, `accepting`, `skippedIds` (mutate-in-place Set) || `driverLocationOverrideStore` | No | Simulation mode location override |
| `useLocaleStore` | Yes | `languageChoice` ('en' \| 'al') |
| `useThemeStore` | Yes | `theme` ('light' \| 'dark' \| 'system') |

---

## Hooks Inventory

| Hook | Used In | Purpose |
|------|---------|---------|
| `useAppSetup` | `_layout.tsx` | Theme sync + translation init gate |
| `useAuth` | `login.tsx`, tab layout | Login/logout, mutation wrapper |
| `useAuthStore` (store) | Many | Auth state access |
| `useDriverTracking` | `_layout.tsx` | Orchestrates heartbeat + battery |
| `useDriverHeartbeat` | `useDriverTracking` | 2–5s heartbeat loop, background task |
| `useDriverBatteryReporting` | `useDriverTracking` | 5-min battery reports |
| `useDriverLocation` | `map.tsx`, `navigation.tsx` | GPS watch with EMA smoothing |
| `useDriverPttReceiver` | `_layout.tsx` | Agora PTT subscription + engine |
| `useNotifications` | `_layout.tsx` | FCM token lifecycle |
| `useStoreStatus` | `_layout.tsx`, `map.tsx`, `home.tsx` | Store banner poll + real-time subscription; exposes `dispatchModeEnabled` |
| `useGlobalOrderAccept` | `_layout.tsx` | Single `ALL_ORDERS_UPDATED` subscription + capacity-aware auto-present + accept/skip handlers; renders `OrderAcceptSheet` globally |
| `useTheme` | Many | Theme token access |
| `useSyncTheme` | `useAppSetup` | System theme listener |
| `useTranslations` | Many | i18n strings + language switch |
| `useInitializeTranslation` | `useAppSetup` | i18n hydration gate |
| `useNavigationStore` (store) | `map.tsx`, `navigation.tsx` | Active navigation state |
| `useNavigationLocationStore` (store) | `navigation.tsx`, `useDriverHeartbeat` | SDK→heartbeat location bridge |
| `useNavigationRoute` | **Unused** | Route fetch + reroute policy |
| `useNavigationCamera` | **Unused** (type in `FloatingMapButtons`) | Camera follow modes |
| `useNavigationSteps` | **Unused** | Turn-by-turn steps |
| `useNavigationState` | **Unused** | Local nav state machine (duplicates navigationStore) |
| `useOffRouteDetection` | **Unused** | Off-route Haversine check |
| `useSmoothCameraTracking` | **Unused** | Camera interpolation |
| `useNavigationSimulation` | **Unused** | GPS simulation for testing |
| `usePredictedTracking` | **Unused** | GPS dead-reckoning for smooth marker |

---

## Utilities

### `utils/mapbox.ts`

Wraps the Mapbox Directions API v5.

- `fetchRouteGeometry(from, to)` — simple route for map preview (10 min TTL cache)
- `fetchNavigationRoute(from, to, waypoints?)` — full route with steps for navigation (5 min TTL cache)
- In-flight deduplication: concurrent identical requests share one `fetch` via a `Map<key, Promise>`
- Call counter: `getDirectionsApiCallCount()` for instrumentation
- Token: `EXPO_PUBLIC_MAPBOX_TOKEN`

### `utils/routeProgress.ts`

Pure computation, no API calls.

- `computeRouteProgress(location, coords, totalDistanceM, totalDurationSec)` → `RouteProgress`
- Algorithm: nearest-vertex walk on polyline + Haversine segment sum + Mapbox speed ratio for ETA
- Used to derive live `remainingDurationSec` without hitting the Directions API again

### `utils/secureTokenStore.ts`

- Native (iOS/Android): `expo-secure-store` (Keychain / Android Keystore)
- Web: `AsyncStorage` fallback
- Keys: `driver_auth_token`, `driver_refresh_token`

---

## Known Issues and Refactor Candidates

These are documented for pre-refactor awareness. All are non-breaking as-is.

### Structural Gaps

| Issue | Location | Impact |
|-------|----------|--------|
| README promises a `modules/` isolation pattern but actual code uses flat top-level `hooks/`, `store/` | `README.md` vs codebase | Cognitive mismatch only |
| `App.tsx` is empty | `App.tsx` | Dead file; `index.tsx` is the real entry |
| `lib/graphql/driverSocket.ts` is empty | `driverSocket.ts` | Dead file |
| `graphql/operations/auth/driverLogin.ts` defines `DRIVER_LOGIN_MUTATION` / `DRIVER_REGISTER_MUTATION` but neither is imported | `driverLogin.ts` | Dead code; login uses generic `login` mutation |
| `map.backup.tsx` exists at repo root of `mobile-driver` | `map.backup.tsx` | Stale backup, should be deleted |
| `drizzle.config.ts` + `drizzle-orm` + `expo-drizzle-studio-plugin` in dependencies | `package.json` | Unused SQLite setup — no local DB is actually used |
| `socket.io-client` in dependencies | `package.json` | WS transport is `graphql-ws` via Apollo; socket.io is unused |

### Logic Duplication

| Issue | Files | Impact |
|-------|-------|--------|
| `ALL_ORDERS_UPDATED` cache update logic is copy-pasted verbatim | `map.tsx` + `navigation.tsx` | Two places to update when subscription shape changes |
| Navigation state is managed in both `navigationStore` (Zustand, active) and `useNavigationState` hook (local state machine, unused) | `store/navigationStore.ts` + `hooks/useNavigationState.ts` | The hook is orphaned; navigationStore is the source of truth |

### Unused Hooks Block

The 8 navigation hooks listed in the Hooks Inventory as "Unused" represent a significant amount of prepared work for a custom navigation view. They are well-written and have good test-surface. During refactoring:
- If staying on `@badatgil/expo-mapbox-navigation`: delete or clearly mark these as pending
- If migrating to custom `@rnmapbox/maps` navigation: wire these hooks into the new navigation screen

### `GET_MY_DRIVER_METRICS` Query Unused in UI

`driver.ts` exports `GET_MY_DRIVER_METRICS` (active orders, delivered today count, gross/net earnings, commission %) but there is no screen currently consuming it. The Earnings screen uses settlements instead.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | GraphQL HTTP endpoint (also used as WS base by scheme swap) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mapbox map rendering + Directions API |

Both are required. Missing either will degrade silently (Apollo disabled, map token empty).

---

## Dependencies of Note

| Package | Purpose |
|---------|---------|
| `@badatgil/expo-mapbox-navigation` | Native Mapbox Navigation SDK wrapper (turn-by-turn) |
| `@rnmapbox/maps` | Mapbox GL map rendering (order map, route lines) |
| `react-native-agora` | Agora RTC for PTT voice broadcast |
| `@react-native-firebase/messaging` | FCM push notifications |
| `expo-task-manager` + `expo-location` | Background location task for heartbeat |
| `apollo3-cache-persist` | Apollo cache persistence to AsyncStorage |
| `graphql-ws` | WebSocket transport for subscriptions |
| `zustand` | App state management |
| `nativewind` | Tailwind CSS for React Native |
| `expo-secure-store` | Secure token storage (Keychain/Keystore) |
| `date-fns` | Date calculations for earnings period filter |
