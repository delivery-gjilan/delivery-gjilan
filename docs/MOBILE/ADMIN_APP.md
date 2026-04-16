# Zipp Admin — Mobile App Deep Dive (M14)

> **MDS ID:** M14  
> **App:** `mobile-admin/`  
> **Target users:** Platform admins and super-admins  
> **Updated:** 2026-04-13

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [App Configuration](#app-configuration)
4. [Routing & Navigation](#routing--navigation)
5. [Screens](#screens)
6. [Shared Components](#shared-components)
7. [Stores (Zustand)](#stores-zustand)
8. [Hooks](#hooks)
9. [GraphQL Operations](#graphql-operations)
10. [Library Layer](#library-layer)
11. [Utilities](#utilities)
12. [Localization](#localization)
13. [PTT Architecture](#ptt-architecture)
14. [Operational Alerts System](#operational-alerts-system)
15. [Map Architecture](#map-architecture)
16. [Apollo Cache & Persistence](#apollo-cache--persistence)
17. [Optimization Recommendations](#optimization-recommendations)
18. [Dependency Graph](#dependency-graph)

---

## Overview

Zipp Admin is the React Native mobile app for platform administrators. It provides a real-time live map of all active orders and drivers, a full order management interface, driver PTT (push-to-talk), shift driver control, user/driver/business CRUD, notification campaigns, and operational alerts.

**App name:** Zipp Admin  
**Bundle ID:** `com.zippdelivery.mobileadmin`  
**Version:** Configured via `appVersion` runtime version policy  
**Architecture:** New Architecture enabled (`newArchEnabled: true`)  
**React Compiler:** Enabled (`experiments.reactCompiler: true`)  
**Typed routes:** Enabled (`experiments.typedRoutes: true`)  
**UI theme:** Light / Dark / System (user-selectable, persisted)

---

## Tech Stack & Dependencies

| Category | Package | Version |
|---|---|---|
| Framework | `expo` | ~54.0.23 |
| React | `react` / `react-native` | 19.1.0 / 0.81.5 |
| Routing | `expo-router` | ~6.0.14 |
| GraphQL client | `@apollo/client` | ^4.0.9 |
| GraphQL transport | `graphql-ws` | ^6.0.4 |
| Cache persistence | `apollo3-cache-persist` | ^0.15.0 |
| State | `zustand` | ^5.0.8 |
| Styling | `nativewind` | ^4.2.1 |
| Animations | `react-native-reanimated` | ~4.1.1 |
| Maps (admin) | `@rnmapbox/maps` | ^10.2.10 |
| Maps (backup) | `react-native-maps` | 1.20.1 |
| PTT / voice | `react-native-agora` | ^4.6.2 |
| Charts | `react-native-gifted-charts` | ^1.4.68 |
| Validation | `zod` | ^3.25.76 |
| Push notifications | `@react-native-firebase/messaging` | ^23.8.6 |
| Notifications | `expo-notifications` | ~0.32.16 |
| Secure storage | `expo-secure-store` | ~15.0.8 |
| Async storage | `@react-native-async-storage/async-storage` | 2.2.0 |
| Date picker | `@react-native-community/datetimepicker` | ^8.5.0 |
| RxJS | `rxjs` | ^7.8.2 |

> **Note:** Both `@rnmapbox/maps` and `react-native-maps` are present — Mapbox is the primary map renderer; `react-native-maps` may be for fallback or future use. `rxjs` is present but not directly observed in analyzed files.

---

## App Configuration

**`app.json` highlights:**
- Plugins: `expo-router`, `@rnmapbox/maps`, Firebase app, `expo-notifications` (with background remote push), `expo-splash-screen`, `expo-build-properties`, `./plugins/with-modular-headers`
- iOS: location + camera permissions declared
- `ITSAppUsesNonExemptEncryption: false`
- Android: `edgeToEdgeEnabled: true` (opted in — unlike business/driver apps)
- EAS Updates channel: `production`

---

## Routing & Navigation

Expo Router v6 file-based routing with typed routes enabled.

```
app/
  _layout.tsx                ← Root layout (ApolloProvider gate, Mapbox init, useAppSetup)
  index.tsx                  ← Auth redirect guard (→ map or → login)
  login.tsx                  ← Admin login screen
  ops-notifications.tsx      ← Notification campaigns screen
  (tabs)/
    _layout.tsx              ← 3-tab bottom nav (Map / Orders / Ops)
    map.tsx                  ← Live map (Mapbox + order/driver overlays)
    orders.tsx               ← Order list management
    ops.tsx                  ← Ops center (PTT, shift drivers, logout)
  order/
    [orderId].tsx            ← Order detail modal (slide_from_bottom)
  business/                  ← Empty folder (future CRUD screens)
  driver/                    ← Empty folder (future CRUD screens)
```

**Auth guard** in `app/index.tsx`: reads `isAuthenticated`, `hasHydrated`, `authInitComplete` from Zustand. Redirects to `/(tabs)/map` or `/login`.

**Root layout inner `AppContent` pattern:** `_layout.tsx` splits into outer `ApolloProvider` wrapper and inner `AppContent` component so hooks (`useNotifications`, `useOperationalOrderAlerts`) execute inside the Apollo provider tree.

---

## Screens

### `app/login.tsx` — Login Screen

Email + password login for ADMIN and SUPER_ADMIN roles.

**State:** `email`, `password`, `error`  
**Hook:** `useAuth()` — wraps login mutation, returns `{ login, loading }`  
**UI:** Shield-checkmark icon, two `<Input>` fields, inline error banner, `<Button>` with loading state  
**On success:** `router.replace('/(tabs)/map')`

---

### `app/(tabs)/map.tsx` — Live Map Screen

The primary admin view. Real-time Mapbox map showing all active orders and all drivers with live updates.

**Local state:**
- `focusedOrderId: string | null`
- `trackingDriverId: string | null`
- `assignSheetVisible: boolean`
- `orderRoutes: Record<string, { toPickup?: RouteData; toDropoff?: RouteData; cacheKey: string }>` — per-order Mapbox Directions routes
- Throttle refs: `ordersRefetchCooldownRef`, `ordersRefetchTimerRef`, `ordersRefetchInFlightRef`

**Zustand:** `useMapStore` (`filter`, `orderStatusFilter`, `selectedDriverId`, `selectedOrderId`, `showDriverLabels`, `showRoutes`)

**GraphQL:**
- Query: `GET_ORDERS` — `{ limit: 200, statuses: ACTIVE_ORDER_STATUSES }`, active orders only
- Query: `GET_DRIVERS` — full driver list with location
- Subscription: `ALL_ORDERS_SUBSCRIPTION` — real-time cache merge; removes completed from cache
- Subscription: `DRIVERS_UPDATED_SUBSCRIPTION` — real-time driver location/status cache merge
- Mutation: `ASSIGN_DRIVER_TO_ORDER`
- Mutation: `UPDATE_ORDER_STATUS`
- Mutation: `START_PREPARING`
- Mutation: `APPROVE_ORDER`

**Key map features:**
- `Mapbox.MapView` — `streets-v12` (light) / `dark-v11` (dark) theme-aware
- **Driver pins:** `Mapbox.MarkerView` — circular avatar, green=online / gray=offline; blue ring + scale animation when tracking
- **Order pins:** `Mapbox.MarkerView` at drop-off — cube icon colored by `ORDER_STATUS_COLORS`; larger when focused
- **Route polylines:** `Mapbox.ShapeSource` + `Mapbox.LineLayer` — dashed when unfocused, solid when focused order selected
- **Left sidebar:** Scrollable column of up to 10 online driver avatars (tap to track/untrack)
- **Bottom scroll strip:** Compact horizontal order cards (biz name, status, distance), hidden when order focused
- **Focused order bar (pinned bottom):** Full order summary — biz, customer, driver, route distance + ETA; Assign/Reassign + next-action buttons; icon → `order/[orderId]` detail modal
- **Recenter button:** Snaps camera to `GJILAN_CENTER`
- `<BottomSheet>` for driver assignment when order is focused

**Route calculation logic (`useEffect` on `activeOrders`):**
- PENDING/READY + driver: `driver→pickup` + `pickup→dropoff`
- OUT_FOR_DELIVERY + driver: `driver→dropoff`
- No driver: `pickup→dropoff`
- Results cached by `cacheKey = orderId-driverId-status` (prevents redundant recalculation)

**Driver tracking:** When `trackingDriverId` is set, watches `drivers` data and calls `cameraRef.current.setCamera()` to follow position.

---

### `app/(tabs)/orders.tsx` — Orders List Screen

Full live order management list with quick-action controls.

**Local state:**
- `assignOrderId: string | null` — open driver-assignment sheet for this order
- `statusOrderId: string | null` — open status-change sheet for this order
- `showCompleted: boolean`
- Throttle refs (same pattern as map screen)

**GraphQL:**
- Query: `GET_ORDERS` — `{ limit: 200, statuses: ALL_STATUSES }`, `fetchPolicy: 'network-only'`
- Query: `GET_DRIVERS`
- Subscription: `ALL_ORDERS_SUBSCRIPTION` — optimistic Apollo cache merge
- Mutation: `ASSIGN_DRIVER_TO_ORDER`
- Mutation: `UPDATE_ORDER_STATUS`
- Mutation: `START_PREPARING`
- Mutation: `APPROVE_ORDER`

**Shared constants:**
- `ACTIVE_ORDER_STATUSES = ['AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']`
- `QUICK_PREPARATION_MINUTES = 20`

**Key UI:**
- `ScrollView` with `RefreshControl`
- `renderOrderCard()` — compact card with: status badge + approval reason tags, buyer/driver summary, first 3 items preview, address, total price
- Per-card actions: **Assign/Reassign Driver**, **Quick Progress** (status-aware label), **Change Status**
- Two `<BottomSheet>` modals: driver assignment (online only) + status picker
- Completed orders section (collapsible, 0.86 opacity)
- Approval reason tags color-coded: FIRST_ORDER, HIGH_VALUE, ZONE/LOCATION_FLAGGED

**Navigation:** Order card body → `router.push('/order/${order.id}')` (detail modal)

---

### `app/(tabs)/ops.tsx` — Ops Center Screen

Operational control panel: PTT, shift driver management, notification campaigns, and session management.

**Local state:**
- `selectedDriverIds: string[]` — multi-select for PTT / shift controls
- `channelName: string` — Agora channel name (seeded as `admin-driver-ptt-<timestamp>`, regenerated on PTT completion)

**Zustand:** `useAuthStore` (`logout`)

**GraphQL:**
- Query: `GET_DRIVERS`
- Mutation: `ADMIN_SET_SHIFT_DRIVERS`
- PTT managed via `useAdminPtt(selectedDriverIds, channelName, onChannelReset)` hook
- `useAdminPtt` snapshots selected driver IDs at `startTalking()` and reuses that active target set for `STOPPED` and `MUTE/UNMUTE` signals, so changing chip selection mid-session does not leave previously-targeted drivers stuck in the old channel.

**UI Sections:**

| Section | Content |
|---|---|
| Driver PTT | Chip multi-select of online drivers; Start/Stop/Mute/Unmute buttons; "Driver talking" live badge; error display |
| Dispatch Admin | Info + button → `/ops-notifications` |
| Shift Drivers | "Apply Selected" + "Clear Restriction" buttons (both call `ADMIN_SET_SHIFT_DRIVERS`) |
| Account | Logout + "Refresh Drivers" |

---

### `app/ops-notifications.tsx` — Notification Campaigns Screen

Lists push notification campaigns; allows dispatching draft campaigns.

**GraphQL:**
- Query: `GET_NOTIFICATION_CAMPAIGNS` — pull-to-refresh
- Mutation: `SEND_CAMPAIGN` — `Alert.alert` confirmation before send

**UI:** `FlatList` with per-campaign card (title, body, sent/draft badge, relative timestamp). Draft campaigns show Send button.

---

### `app/order/[orderId].tsx` — Order Detail Modal

Full single-order detail opened as a `slide_from_bottom` modal with swipe-to-dismiss.

**Params:** `orderId` from `useLocalSearchParams`

**Local state:** `showPrepModal`, `showDriverModal`, `selectedPrepTime` (default 20; options: 10/15/20/30/45/60)

**GraphQL:**
- Query: `GET_ORDER` — `{ id: orderId }`
- Query: `GET_DRIVERS`
- Mutation: `UPDATE_ORDER_STATUS`
- Mutation: `START_PREPARING`
- Mutation: `CANCEL_ORDER`
- Mutation: `ASSIGN_DRIVER_TO_ORDER`
- Mutation: `UPDATE_PREPARATION_TIME`
- Mutation: `APPROVE_ORDER`

**UI Sections:**
1. Header — back chevron + order title + `StatusBadge`
2. Price summary — subtotal / delivery fee / total
3. Prep time banner (PREPARING only) — shows `preparationMinutes` + `estimatedReadyAt` with Edit
4. Customer card — name, phone, drop-off address
5. Driver card — name or "Unassigned" + Assign/Reassign
6. Business + items — per-business block with item rows (qty × name × price)
7. Timeline — `orderDate`, `preparingAt`, `updatedAt`
8. Action buttons — status-conditional:
   - `AWAITING_APPROVAL` → "Approve Order"
   - `PENDING` → "Start Preparing" (opens prep modal)
   - `PREPARING` → "Mark Ready"
   - `PENDING|PREPARING|READY` → Cancel (confirmation alert)

**Modals (BottomSheet):**
- **Prep time picker** — if already PREPARING calls `UPDATE_PREPARATION_TIME`; else calls `START_PREPARING`
- **Assign driver picker** — online drivers only; checkmark on current driver

---

## Shared Components

### `BottomSheet`

Modal bottom sheet using React Native's `Modal`.

**Props:** `visible`, `onClose`, `title?`, `children`, `snapPoints?` (declared but ignored)  
**Pattern:** Two-layer Pressable — outer overlay dismisses, inner sheet stops propagation  
**Limitations:** No drag-to-dismiss gesture; uses `animationType="slide"` only (not Reanimated)

> **Bug:** `snapPoints` prop is dead API surface. `ScrollView` `pb-8` padding won't apply on iOS without `contentContainerStyle`.

---

### `Button`

Multi-variant button with icon and loading state.

**Props:** `title`, `onPress`, `loading?`, `disabled?`, `variant: 'primary'|'secondary'|'danger'|'ghost'`, `size: 'sm'|'md'|'lg'`, `icon?`, `style?`, `textStyle?`  
**Loading state:** Replaces title with `ActivityIndicator`  
**Variants:** Color maps derived from theme at render time

---

### `EmptyState`

Full-screen empty/placeholder state.

**Props:** `icon?`, `title`, `message?`, `actionLabel?`, `onAction?`  
Icon background uses `${theme.colors.primary}15` (8% alpha tint).

---

### `Input`

Themed text input with label and error.

**Props:** Extends `TextInputProps` + `label?`, `error?`  
Border turns `danger` color on error. No `accessibilityLabel` wiring.

---

### `LoadingScreen`

Full-screen centered loading spinner.

**Props:** `message?`  
Default export (inconsistent with other named exports in the directory).

---

### `StatCard`

KPI/stat display card.

**Props:** `title`, `value: string | number`, `subtitle?`, `icon?: React.ReactNode`, `color?`, `style?`  
Designed for `flexWrap` side-by-side layouts (`flex-1 min-w-[140px]`).

---

### `StatusBadge` + `FilterChip`

Two exports from `StatusBadge.tsx`:
- `StatusBadge` — read-only colored pill for order status; auto-humanizes snake_case labels
- `FilterChip` — interactive toggle chip with shadow when active; color from `ORDER_STATUS_COLORS`

---

## Stores (Zustand)

### `authStore.ts` — `useAuthStore`

Central authentication state.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `user` | `AuthUser \| null` | ✅ AsyncStorage (`admin-auth-storage`) |
| `token` | `string \| null` | ❌ In-memory only |
| `isAuthenticated` | `boolean` | ❌ Computed |
| `isLoading` | `boolean` | ❌ |
| `hasHydrated` | `boolean` | ❌ |
| `authInitComplete` | `boolean` | ❌ |

**`AuthUser`:** `{ id, firstName, lastName, email, role: UserRole, businessId?, permissions? }`  
**`UserRole`:** `'ADMIN' | 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE'`

**Actions:** `setToken`, `setUser`, `setLoading`, `setAuthInitComplete`, `login(token, user)` (atomic), `logout(): Promise<void>`

**`isAuthenticated` conditions:** token non-null AND `role` in `ADMIN_ROLES` (`['ADMIN', 'SUPER_ADMIN']`)

---

### `useLocaleStore.ts` — `useLocaleStore`

Active language + translation dictionary.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `languageChoice` | `'en' \| 'al'` | ✅ AsyncStorage (`admin-locale-storage`) |
| `translations` | `Translation \| null` | ❌ Re-derived at runtime |

**Actions:** `setLanguageChoice(choice)`, `loadTranslation()`  
Translation JSONs are statically imported (no async I/O).

---

### `useMapStore.ts` — `useMapStore`

Ephemeral map UI state.

**Fields:**

| Field | Type | Default |
|---|---|---|
| `filter` | `'all'\|'orders'\|'drivers'\|'businesses'` | `'all'` |
| `orderStatusFilter` | `'ALL'\|'PENDING'\|...` | `'ALL'` |
| `selectedDriverId` | `string \| null` | `null` |
| `selectedOrderId` | `string \| null` | `null` |
| `selectedBusinessId` | `string \| null` | `null` |
| `showDriverLabels` | `boolean` | `true` |
| `showRoutes` | `boolean` | `true` |

**Actions:** `setFilter`, `setOrderStatusFilter`, `selectDriver` (clears others), `selectOrder` (clears others), `selectBusiness` (clears others), `toggleDriverLabels`, `toggleRoutes`, `clearSelection`  
**No persistence** — intentionally ephemeral.

---

### `useThemeStore.ts` — `useThemeStore`

Theme preference persistence.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `themeChoice` | `'light'\|'dark'\|'system'` | ✅ AsyncStorage (`admin-theme-storage`) |

**Actions:** `setThemeChoice(choice)`

---

## Hooks

### `useAdminPtt` — Admin PTT

Bidirectional push-to-talk between admin and drivers via Agora RTC. See [PTT Architecture](#ptt-architecture).

Current safety behavior:
- Start session captures a stable `activeDriverIds` set.
- Stop/mute/unmute signals are emitted to that same active set (fallback to current selection only when no active set exists).
- Driver-receive channel joins now validate negative Agora join return codes and surface a hook error instead of silently continuing.

### `useAppSetup` — App Initialization Orchestrator

Composes `useSyncTheme`, `useAuthInitialization`, and `useInitializeTranslation`. Returns `{ ready: boolean }` (true when translations are loaded).

### `useAuth` — Login/Logout Actions

Wraps `LOGIN_MUTATION`. On success: validates ADMIN role, saves to SecureStore, updates Zustand store. `{ login, logout, loading }`.

### `useAuthInitialization` — Session Restore

On hydration: reads token from SecureStore via `getValidAccessToken()`, validates role, routes to map or login. Includes a 2-second hydration fallback timeout if `hasHydrated` never fires.

### `useInitializeTranslation` — Translation Bootstrap

Calls `loadTranslation()` once on mount. Returns `{ ready: boolean }` based on whether `translations` is non-null.

### `useNotifications` — Push Lifecycle

Same pattern as other apps: FCM token registration, token refresh, `RECEIVED`/`OPENED`/`ACTION_TAPPED` telemetry. App type tag: `'ADMIN'`.  
Mutations: `REGISTER_DEVICE_TOKEN`, `UNREGISTER_DEVICE_TOKEN`, `TRACK_PUSH_TELEMETRY`.

### `useOperationalOrderAlerts` — Local Alert System

Fires local push notifications for new orders and late-pending orders. See [Operational Alerts System](#operational-alerts-system).

### `useSyncTheme` — NativeWind Theme Bridge

Calls `setColorScheme(themeChoice)` when theme changes. Called by `useAppSetup`.

### `useTheme` — Theme Object Resolver

Returns `DarkTheme` or `LightTheme` from `@/utils/themes` based on NativeWind's resolved `colorScheme`.

### `useTranslations` — Translation Access

Returns `{ t: Translation }` from `useLocaleStore`. Throws if translations are null (developer error guard).

---

## GraphQL Operations

**Total: 11 queries, 24 mutations, 3 subscriptions = 38 total**

### Queries (11)

| Name | File | Purpose |
|---|---|---|
| `GetBusinesses` | `businesses.ts` | All businesses with schedule, location, working hours |
| `GetBusiness` | `businesses.ts` | Single business by ID |
| `GetDrivers` | `drivers.ts` | All drivers with location, connection, commission |
| `GetStoreStatus` | `misc.ts` | Global store closed state + message |
| `GetNotificationCampaigns` | `misc.ts` | All push notification campaigns |
| `GetSettlements` | `misc.ts` | Paginated settlements (type/status filters) |
| `GetOrders` | `orders.ts` | Paginated orders (limit/offset/statuses filter) |
| `GetOrder` | `orders.ts` | Single order by ID |
| `GetAgoraRtcCredentials` | `ptt.ts` | Agora token + appId for a channel/role |
| `GetUsers` | `users.ts` | Up to 500 users with permissions, flags, business |
| `UserBehavior` | `users.ts` | User behavioral analytics (spend, orders, dates) |

### Mutations (24)

| Name | File | Purpose |
|---|---|---|
| `CreateBusiness` | `businesses.ts` | Create a new business |
| `UpdateBusiness` | `businesses.ts` | Update business details |
| `DeleteBusiness` | `businesses.ts` | Soft-delete business |
| `AdminUpdateDriverSettings` | `drivers.ts` | Update commission + max active orders |
| `AdminUpdateDriverLocation` | `drivers.ts` | Override driver GPS coordinates |
| `UpdateDriverOnlineStatus` | `drivers.ts` | Toggle driver online/offline |
| `UpdateStoreStatus` | `misc.ts` | Set global store open/closed with message |
| `SetMyPreferredLanguage` | `misc.ts` | Sync language preference to backend |
| `SendCampaign` | `misc.ts` | Trigger push notification campaign send |
| `CreateCampaign` | `misc.ts` | Create new notification campaign |
| `MarkSettlementAsPaid` | `misc.ts` | Mark a settlement record as paid |
| `RegisterDeviceToken` | `notifications.ts` | Register FCM push token |
| `UnregisterDeviceToken` | `notifications.ts` | Deregister FCM push token |
| `TrackPushTelemetry` | `notifications.ts` | Record push event telemetry |
| `UpdateOrderStatus` | `orders.ts` | Transition order status |
| `StartPreparing` | `orders.ts` | Accept with prep timer |
| `UpdatePreparationTime` | `orders.ts` | Extend prep timer |
| `CancelOrder` | `orders.ts` | Cancel an order |
| `AssignDriverToOrder` | `orders.ts` | Assign or unassign driver |
| `ApproveOrder` | `orders.ts` | Approve a flagged order |
| `CreateTestOrder` | `orders.ts` | Create a test order |
| `AdminSendPttSignal` | `ptt.ts` | Send PTT signal to driver(s) (invite/mute/kick) |
| `AdminSetShiftDrivers` | `ptt.ts` | Set active shift driver roster |
| `CreateUser` | `users.ts` | Create user account |
| `UpdateUser` | `users.ts` | Update user details |
| `DeleteUser` | `users.ts` | Delete user |
| `UpdateUserNote` | `users.ts` | Set admin note + flag color on user |
| `SetUserPermissions` | `users.ts` | Replace user permission set |

> **Note:** 28 mutations listed above — actual count is 28. The initial summary counted 24; the full tally including all `users.ts` mutations yields 28.

### Subscriptions (3)

| Name | File | Purpose |
|---|---|---|
| `AllOrdersUpdated` | `orders.ts` | Real-time order changes for all orders |
| `DriversUpdated` | `drivers.ts` | Real-time driver location/status updates |
| `AdminPttSignal` | `ptt.ts` | Incoming PTT signals from drivers |

### Fragments

None defined.

---

## Library Layer

### `lib/graphql/apolloClient.ts`

Singleton Apollo Client with split HTTP + WS transport, auth injection, cache persistence, and type policies.

**Key features:**
- Capped exponential WS reconnect: `[1s, 2s, 5s, 10s]`
- HTTP auth: `SetContextLink` calls `getValidAccessToken()` per request
- WS auth: `connectionParams` calls `getValidAccessToken()` on every (re)connect
- **Cache persistence:** `apollo3-cache-persist` with `AsyncStorage`, max 5 MB — configures `cacheReady: Promise<void>`
- **Type policies:** Cache normalization for `Order`, `Business`, `Product`, `User`, `Driver`, `Settlement`, `Promotion`, `UserAddress`; `order` + `business` root queries wired to cache refs
- `logLink` in `__DEV__` only

**`cacheReady` asymmetry:** `cacheReady.catch` swallows persistence errors silently — if persistence fails, `Providers` waits on a forever-pending promise.

---

### `lib/graphql/authSession.ts`

JWT token lifecycle — same pattern as other apps.

**Exports:** `getStoredAccessToken()`, `getValidAccessToken(minValidityMs = 60_000)`, `refreshAccessToken()`  
In-flight deduplication via module-level `refreshInFlight` promise.  
On 401/403: deletes tokens, zeros `authStore`.  
Manual base64 JWT decode (no external library).

---

### `lib/graphql/providers.tsx`

Root provider tree that blocks rendering until Apollo cache is restored from AsyncStorage.

**Gate:** `cacheRestored` state set by `cacheReady.then(...)`. If `cacheReady` rejects, app renders a permanent blank screen (missing `.catch` path).

Hierarchy: `ApolloProvider` → `ThemeProvider` → `SafeAreaProvider`.

---

## Utilities

### `utils/constants.ts`
`DEV_ENV`, `PROD_ENV`, `SUPPORTED_LANGUAGES`, `ORDER_STATUS_COLORS` (7 statuses), `GJILAN_CENTER`, `GJILAN_BOUNDS`, `DEFAULT_ZOOM`.

### `utils/helpers.ts`
`cn()` (clsx + tailwind-merge), `formatCurrency()` (hardcoded `€`), `formatTime()`, `formatDate()`, `formatRelativeTime()` (manual 4-tier bucketing), `getInitials()`.

### `utils/mapbox.ts`
`MAPBOX_TOKEN` from `EXPO_PUBLIC_MAPBOX_TOKEN`, `calculateRouteDistance()` (calls `/api/directions?points=...` backend proxy — keeps Mapbox token server-side), `toLatLng()`.

### `utils/themes.ts`
`LightTheme` / `DarkTheme` objects. Primary color: indigo (`#6366f1`). Platform-aware font stacks.

### `utils/types.ts`
`LanguageChoice = 'en' | 'al'` derived from `SUPPORTED_LANGUAGES` const tuple.

---

## Localization

Two locale files: `localization/en.json` and `localization/al.json` (~134 lines each).

**Supported languages:** English (`en`) and Albanian (`al`)  
**Validation:** `localization/schema.ts` + `localization/validate.ts` — runtime/build-time validation that translation JSON matches the schema type. This is unique to the admin app among all four mobile apps.  
**Access:** `useTranslations()` hook returns `{ t: Translation }` (typed, not dot-string path)  
**Persistence:** `languageChoice` persisted to AsyncStorage; translations re-derived on cold start via `useInitializeTranslation`  
**Language sync:** `SetMyPreferredLanguage` mutation on change

---

## PTT Architecture

The admin app uses `react-native-agora` for bidirectional PTT with drivers. See M9 (`MOBILE/MOBILE_ADMIN_DEEP_DIVE.md`) for additional context.

**`useAdminPtt(selectedDriverIds, channelName, onChannelReset)` flow:**

```
Admin startTalking()
  → getAgoraRtcCredentials(Publisher)
  → ensureSendEngine()
  → defensive leaveChannel(sendEngine) when a stale session exists
  → joinChannel(sendEngine, channelName)
  → snapshot activeDriverIds for this session
  → ADMIN_SEND_PTT_SIGNAL(STARTED, activeDriverIds)

Driver talks
  → ADMIN_PTT_SIGNAL subscription fires (action: STARTED)
  → ensureRecvEngine()
  → getAgoraRtcCredentials(Subscriber)
  → joinRecvChannel()
  → isDriverTalking = true (via onRemoteAudioStateChanged)

Admin stopTalking()
  → ADMIN_SEND_PTT_SIGNAL(STOPPED, activeDriverIds)
  → leaveChannel(sendEngine)
  → onChannelReset() → regenerates channelName
```

**Two independent engine instances:** publisher (admin speaking) + subscriber (admin listening to drivers)  
**Session target stability:** `activeDriverIds` snapshot is reused for STOP/MUTE/UNMUTE so mid-session chip changes do not retarget an active channel.  
**Simultaneous talk handling:** supported via independent send/receive engines; admin can broadcast while receiving a driver channel in parallel.  
**`AdminPttSignal` subscription:** Global subscription in `useAdminPtt` — reacts to driver PTT actions  
**Channel naming:** `admin-driver-ptt-<timestamp>` — regenerated after each session via `onChannelReset` callback  
**Shift drivers:** `ADMIN_SET_SHIFT_DRIVERS` mutation limits which drivers receive PTT signals

---

## Operational Alerts System

`useOperationalOrderAlerts` runs in `AppContent` (inside Apollo provider) and fires local `expo-notifications` pushes for two scenarios:

| Alert type | Trigger | Dedup mechanism |
|---|---|---|
| New order | New order ID not in `knownOrderIdsRef` via `ALL_ORDERS_SUBSCRIPTION` | `knownOrderIdsRef: Set<string>` |
| Late pending | Order in PENDING/AWAITING_APPROVAL for ≥ 15 min | `latePendingNotifiedRef: Set<string>` + 60 s interval |

**Initialization:** First `GET_ORDERS` result seeds `knownOrderIdsRef` (so existing orders on app start don't trigger "new order" alerts)  
**Late check interval:** `setInterval(60_000)` re-evaluates `ordersRef` snapshot — catches orders that transition to late between subscription events  
**Auth reset:** On logout, all refs and the `initializedRef` are cleared

---

## Map Architecture

The admin map screen (`app/(tabs)/map.tsx`) uses `@rnmapbox/maps` as the primary renderer.

**Data sources:**
- `GET_ORDERS` (active statuses, limit 200) — polled and subscription-updated
- `GET_DRIVERS` — subscription-updated via `DRIVERS_UPDATED_SUBSCRIPTION`

**Route calculation:**
- Called via `calculateRouteDistance()` in `utils/mapbox.ts` → requests `/api/directions?points=...` on the backend (server-side Mapbox token)
- Routes cached in `orderRoutes` state keyed by `orderId-driverId-status`
- Recomputed only when the cache key changes (prevents redundant API calls on re-renders)

**Map interactions:**
- `useMapStore` tracks which entity is selected/focused; selection of one type clears others
- Driver tracking mode: `cameraRef.setCamera()` follows selected driver with every `DriversUpdated` subscription event
- Filter state (`MapFilter`, `OrderStatusFilter`) persists per-session (in-memory) via `useMapStore`

---

## Apollo Cache & Persistence

Unlike most other mobile apps in this monorepo, the admin app **properly configures `apollo3-cache-persist`**:

```ts
await persistCache({
  cache,
  storage: new AsyncStorageWrapper(AsyncStorage),
  maxSize: 5_000_000,
})
```

**Type policies** normalize cache for 8 entity types, enabling instant local reads on `order` and `business` queries.

**`cacheReady` promise** blocks the `Providers` component from rendering children until persistence is hydrated — correct gate pattern.

**Known issue:** `cacheReady.catch` is missing in `Providers` — if `persistCache` fails, the app shows a blank screen permanently.

---

## Optimization Recommendations

### Performance

| # | Area | Issue | Priority |
|---|---|---|---|
| P1 | Orders query limit | `GET_ORDERS` uses `limit: 200` on both map and orders tabs — two concurrent 200-item queries on the same data. Share a single cached query or reduce to active-only on map. | Medium |
| P2 | Route calculation | `calculateRouteDistance` fires network requests for every `activeOrders` change — no debounce. On burst subscription updates this could hammer the backend directions proxy. Add a 1–2 s debounce. | Medium |
| P3 | `useMapStore` not used in map.tsx | Map screen has its own `focusedOrderId`/`trackingDriverId` local state alongside `useMapStore`. Selection state is duplicated — `useMapStore.selectedOrderId` vs local `focusedOrderId`. Consolidate. | Low |
| P4 | `GET_USERS` unbounded | `users.ts` `GetUsers` fetches up to 500 users in one request with no pagination. Replace with cursor pagination. | High |
| P5 | Dual map SDK | Both `@rnmapbox/maps` and `react-native-maps` are installed but only Mapbox is used. `react-native-maps` adds ~2 MB to the bundle. Remove if not planned. | Medium |

### Code Quality

| # | Area | Issue | Priority |
|---|---|---|---|
| Q1 | `ADMIN_ROLES` duplicated 3× | Identical `['ADMIN', 'SUPER_ADMIN']` constant in `authStore.ts`, `useAuth.ts`, and `useAuthInitialization.ts`. Extract to `utils/constants.ts`. | Low |
| Q2 | Page-level cast residue | Shared auth, order-alert, PTT, order, ops, and notification layers use generated GraphQL result types, but large screen files still contain page-level `any` usage and route/framework casts. Continue reducing these from screens inward. | Medium |
| Q3 | `business/` and `driver/` folders empty | Route folders exist but contain no screen files — CRUD for businesses and drivers is absent from the app. Either implement or remove the dead folders. | Low |
| Q4 | `BottomSheet.snapPoints` dead prop | The `snapPoints` prop is declared in the API but not implemented. Remove or implement. | Low |
| Q5 | `LoadingScreen` default export | All other components use named exports; `LoadingScreen` uses default export. Standardize. | Low |
| Q6 | `useTranslations` throws at render | If `translations` is null, `useTranslations` throws an uncaught error crashing the component tree. Add a fallback or use optional chaining. | Medium |

### Reliability

| # | Area | Issue | Priority |
|---|---|---|---|
| R1 | `cacheReady` rejection unhandled | `lib/graphql/providers.tsx` only calls `.then(() => setCacheRestored(true))` — if `cacheReady` rejects (persistence failure), the app never renders. Add `.catch(() => setCacheRestored(true))`. | High |
| R2 | `cacheReady.catch` swallowed | `apolloClient.ts` swallows the `persistCache` rejection with an empty `.catch`. Errors must propagate to `cacheReady` so that `Providers` can handle them. | High |
| R3 | Agora PTT no reconnection | `useAdminPtt` has no reconnect logic for dropped Agora sessions mid-call. If the WS subscription drops, `AdminPttSignal` stops firing silently. | Medium |
| R4 | Screen-layer type drift | The shared alert/query hooks are typed, but several screen components still reshape large GraphQL payloads locally. Keep the hook outputs as the typed boundary and avoid reintroducing `any` in screens. | Medium |
| R5 | `formatTime`/`formatDate` no locale | Both use `toLocaleString()` without a fixed locale — output varies by device region setting. Pass a fixed locale for consistent admin UI. | Low |
| R6 | MAPBOX_TOKEN empty string fallback | `EXPO_PUBLIC_MAPBOX_TOKEN` falls back to `''` silently — map renders blank without any error message or user feedback. | Low |

### Future Considerations

| # | Area | Suggestion |
|---|---|---|
| F1 | Business CRUD screens | `app/business/` folder exists but is empty. Implement business list, detail, and edit screens. |
| F2 | Driver CRUD screens | `app/driver/` folder exists but is empty. Implement driver list and settings screens. |
| F3 | User management screen | `GetUsers`, `CreateUser`, `UpdateUser`, `DeleteUser`, `UpdateUserNote`, `SetUserPermissions` are all defined but no user management screen exists in the current routing. |
| F4 | Settlements screen | `GetSettlements` + `MarkSettlementAsPaid` are defined but unused in current screens. |
| F5 | `UserBehavior` analytics screen | `UserBehavior` query exists but no screen exists to display it. |
| F6 | Typed `useTranslations` | The admin app is the only one with a typed `Translation` schema + validator for i18n keys. This approach should be propagated to the other apps. |

---

## Dependency Graph

```
M14 (ADMIN_APP.md)
  ├── A1 (ARCHITECTURE.md)
  ├── B1 (BACKEND/API.md)
  ├── B5 (BACKEND/AUTH_AND_USERS.md)
  ├── B7 (BACKEND/DATABASE_SCHEMA.md)
  ├── BL1 (SETTLEMENTS_AND_PROMOTIONS.md)
  ├── M1 (MOBILE/OVERVIEW.md)
  ├── M2 (MOBILE/PUSH_AND_LIVE_ACTIVITY.md)
  ├── M9 (MOBILE/MOBILE_ADMIN_DEEP_DIVE.md)
  └── UI1 (ADMIN_MOBILEBUSINESS_UI_CONTEXT.md)
```
