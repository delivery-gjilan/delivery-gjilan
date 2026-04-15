# Zipp Business — Mobile App Deep Dive (M13)

> **MDS ID:** M13  
> **App:** `mobile-business/`  
> **Target users:** Business owners and employees (restaurant/shop operators)  
> **Updated:** 2026-04-15

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [App Configuration](#app-configuration)
4. [Routing & Navigation](#routing--navigation)
5. [Screens](#screens)
6. [Global Components](#global-components)
7. [Stores (Zustand)](#stores-zustand)
8. [Hooks](#hooks)
9. [GraphQL Operations](#graphql-operations)
10. [Library Layer](#library-layer)
11. [Utilities](#utilities)
12. [Localization](#localization)
13. [RBAC](#rbac)
14. [Notification & Push Architecture](#notification--push-architecture)
15. [Device Health Telemetry](#device-health-telemetry)
16. [Order Sync Architecture](#order-sync-architecture)
17. [Optimization Recommendations](#optimization-recommendations)
18. [Dependency Graph](#dependency-graph)

---

## Overview

Zipp Business is the React Native operator app for businesses on the Zipp Go platform. Business owners and employees use it to manage live orders, track finances and settlements, manage product catalogs, configure business hours and settings, and communicate with the admin platform.

**App name:** Zipp Business  
**Bundle ID:** `com.zippdelivery.mobilebusiness`  
**EAS Project ID:** `dc536dcd-100f-4271-82f4-2e8fcbdbb345`  
**Version:** 1.0.0 / Runtime 1.0.0  
**Architecture:** New Architecture enabled (`newArchEnabled: true`)  
**UI theme:** Dark only  
**Deep link scheme:** `delivery-gjilan-business`

---

## Tech Stack & Dependencies

| Category | Package | Version |
|---|---|---|
| Framework | `expo` | ~54.0.23 |
| React | `react` / `react-native` | 19.1.0 / 0.81.5 |
| Routing | `expo-router` | ~6.0.14 |
| GraphQL client | `@apollo/client` | ^4.0.9 |
| GraphQL transport | `graphql-ws` | ^6.0.4 |
| State | `zustand` | ^5.0.3 |
| Styling | `nativewind` | ^4.2.1 |
| Animations | `react-native-reanimated` | ~4.1.1 |
| Images | `expo-image` | ~3.0.10 |
| Push notifications | `@react-native-firebase/messaging` | ^23.8.6 |
| Notifications | `expo-notifications` | ~0.32.16 |
| Secure storage | `expo-secure-store` | ~15.0.8 |
| Async storage | `@react-native-async-storage/async-storage` | 2.2.0 |
| Haptics | `expo-haptics` | ~15.0.7 |
| Audio | `expo-av` | ^16.0.8 |
| Battery | `expo-battery` | ~10.0.8 |
| Date formatting | `date-fns` | ^4.1.0 |
| Navigation | `@react-navigation/bottom-tabs` + `@react-navigation/native` | ^7.x |

> **Note:** `apollo3-cache-persist` is listed in `package.json` but **not wired up** in `lib/apollo.ts` — dead dependency. `rxjs` is present but not used in analyzed files.

---

## App Configuration

**`app.json` highlights:**
- `supportsTablet: true` on iOS (tablet layout is custom-handled in orders screen)
- `edgeToEdgeEnabled: false` on Android (opted out of Android 15 enforcement)
- `ITSAppUsesNonExemptEncryption: false`
- OTA update channel: `production`

**Expo plugins:** `expo-router`, `expo-secure-store`, `@react-native-firebase/app`, `expo-notifications`, `./plugins/with-modular-headers`

---

## Routing & Navigation

Expo Router v6 file-based routing. Two top-level routes:

```
app/
  _layout.tsx              ← Root layout (ApolloProvider, auth guard, global subscription)
  login.tsx                ← Login screen
  (tabs)/
    _layout.tsx            ← Tab bar (RBAC-aware, pending-order badge)
    index.tsx              ← Orders screen (main operational screen)
    dashboard.tsx          ← Analytics dashboard
    finances.tsx           ← Financial & settlements screen
    messages.tsx           ← Admin↔business chat
    products.tsx           ← Product catalog CRUD
    settings.tsx           ← Account, schedule, notifications, language
    settlement-history.tsx ← Read-only settlement history
```

**Auth guard** in `_layout.tsx`:
- Waits for `hasHydrated && authInitComplete` (Zustand + SecureStore bootstrap complete)
- Shows loading spinner (black + purple) during hydration
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login`

---

## Screens

### `app/_layout.tsx` — Root Layout

ApolloProvider wrapper + auth guard + global overlay components.

**State:** `incomingMessage` (admin message for banner), `isMounted` ref  
**Zustand:** `useAuthStore` (`isAuthenticated`, `hasHydrated`, `authInitComplete`), `useLocaleStore` (`loadTranslation`)  
**GraphQL:** `BUSINESS_MESSAGE_RECEIVED_SUB` subscription — fires globally for all admin messages  
**Hooks called:** `useAuthInitialization`, `useNotifications`, `useBusinessDeviceMonitoring`  
**Always-rendered overlays:**
- `BusinessMessageBanner` — shown when `incomingMessage` is set (ADMIN role messages only)
- `StoreClosedOverlay` — shown when `isAuthenticated` (reads ops state internally)

---

### `app/login.tsx` — Login Screen

Email/password login for BUSINESS_OWNER and BUSINESS_EMPLOYEE roles only.

**State:** `email`, `password`, `showPassword`, `loading`  
**Zustand:** `useAuthStore` (`login`)  
**GraphQL:** `LOGIN_MUTATION` (BusinessLogin)  
**Behaviors:**
- Role guard: rejects non-business roles before saving token
- Business guard: rejects users with no `businessId` / `business`
- 404 network error shows diagnostic hint pointing to `EXPO_PUBLIC_API_URL`
- Saves `token` via `saveToken()`, `refreshToken` via `saveRefreshToken()` to SecureStore
- Password visibility toggle with `eye/eye-off` icon
- `onSubmitEditing` on password field triggers login

---

### `app/(tabs)/_layout.tsx` — Tab Bar Layout

Registers the 7 tabs, applies RBAC visibility, shows pending-order count badge.

**Zustand:** `useAuthStore` (`user`)  
**GraphQL:** `GET_BUSINESS_ORDERS` polled every **15 s** — filters for PENDING to compute tab badge count  

**Tabs and permissions:**

| Tab | Route | Permission required |
|---|---|---|
| Orders | `index` | none (always visible) |
| Products | `products` | `ManageProducts` |
| Dashboard | `dashboard` | `ViewAnalytics` |
| Finances | `finances` | `ViewAnalytics` |
| Messages | `messages` | none |
| Settlement History | `settlement-history` | none |
| Settings | `settings` | `ManageSettings` |

Tabs guarded by permissions are hidden via `{ display: 'none' }` style (rendered but visually absent).  
Amber numeric badge on Orders tab for PENDING order count scoped to `user.businessId`.

---

### `app/(tabs)/index.tsx` — Orders Screen

The primary operational screen. Full real-time order lifecycle management.

**Local state (28+ `useState`):**
- `etaModalVisible`, `selectedOrderId`, `selectedEta`, `customEta`
- `tick` — incremented every 1 s via `setInterval` to drive live elapsed timers on order cards
- `expandedOrderIds: Set<string>` — per-order collapsible item list state
- `storeCloseModalVisible`, `closingReason`
- `prepModalVisible`, `selectedPrepTime`, `customPrepTime`
- `productModalOrder`, `addTimeModalOrder`, `addTimeAmount`, `customAddTime`
- `showCompleted`, `completedPage`
- `removeItemModal`, `removeItemReason`

**Refs:**
- `lastTapRef` — per-order timestamp for double-tap gesture detection
- `singleTapTimerRef` — 420 ms debounce timer for single/double tap disambiguation
- `pendingOrderIdsRef` — previous frame's pending order IDs for new-order detection
- `soundRef: Audio.Sound` — holds `beep.wav` audio instance
- `refetchCooldownRef`, `refetchInFlightRef`, `refetchTimerRef` — throttle/debounce for subscription-triggered refetches

**Zustand:** `useAuthStore` (`user`)

**GraphQL:**
- Query: `GET_BUSINESS_ORDERS` — primary orders list
- Query: `GET_BUSINESS_OPERATIONS` — store open/close status, `avgPrepTimeMinutes`; `fetchPolicy: 'network-only'`
- Query: `GET_BUSINESS_ORDER_REVIEWS` — `limit: 25` order reviews
- Subscription: `ORDERS_SUBSCRIPTION` (`AllOrdersUpdated`) — direct Apollo cache write via `apolloClient.cache.updateQuery`; falls back to `scheduleRefetch()` if result is empty
- Mutation: `UPDATE_ORDER_STATUS` — READY and CANCELLED transitions
- Mutation: `START_PREPARING` — accept with `preparationMinutes`
- Mutation: `UPDATE_PREPARATION_TIME` — add time to in-progress order
- Mutation: `REMOVE_ORDER_ITEM` — remove item with required reason
- Mutation: `UPDATE_BUSINESS_OPERATIONS` — open/close store, set `avgPrepTimeMinutes`

**Key UI features:**
- `FlatList` of order cards with status-color-coded left border
- PENDING cards have **blinking red border** (`tick % 2 === 0`)
- Collapsible item list (collapses beyond 5 items)
- Left `StatusRail` includes status filters plus compact store open/closed, average prep-time, and Direct Call actions
- The Direct Call action is removed live when the global store setting is turned off because the screen listens to `storeStatusUpdated`
- Per-business direct-dispatch state is refreshed by the `businessUpdated(id)` subscription, so admin-side business edits drop the action without needing a full app restart
- **ETA modal** — preset chips 5/10/15/25/30/45 min + custom input
- **Add-time modal** — presets 5/10/15/20/30 + custom text input, capped at 180 min
- **Store close modal** — optional closure reason text field
- **Avg prep time modal** — presets 10/15/20/25/30/45 min
- **Direct Dispatch modal** — full-screen request form with sticky header, fixed bottom action bar, live availability status, recipient fields, preparation-minute presets, and driver notes; no request-side fixed amount entry
- **Product image modal** — populated for market-type businesses (shows item product images)
- **Remove item modal** — required reason field
- **Completed orders section** — paginated 10/page with Load More button
- **Reviews section** — star rating + text display
- Empty order state is text-only (`No orders for now`) with no decorative icon
- **Tablet layout** (`width >= 768`) — order cards rendered side-by-side

**Behaviors:**
- **Audio alert:** `beep.wav` plays 3× with 1 s gaps when `hasPendingOrders`, repeats every 17 s
- **Haptic feedback:** `Warning` on new pending orders, `Success` on status mutations
- **Double-tap gesture:** PENDING → opens ETA modal (market: marks READY directly); PREPARING → marks READY
- **Single-tap on market order** (420 ms debounce): opens product image modal
- **Market business variant:** skips PREPARING state entirely; labels as "Packing"
- **`scheduleRefetch()`:** custom throttler — 1200 ms cooldown + 350 ms debounce to avoid burst refetch storms

- **`GetStoreStatus`** — queried to gate the Direct Call rail action visibility (both `storeSettings.directDispatchEnabled` AND `business.directDispatchEnabled` must be true)
- **`DirectDispatchAvailability`** — checked when the Direct Call rail action opens the sheet (network-only); contains `available`, `reason`, `freeDriverCount`
- **`CreateDirectDispatchOrder`** — mutation to create a direct dispatch order (recipientPhone, recipientName?, address, driverNotes?)
  - Includes `preparationMinutes` so early dispatch timing can be scheduled from the request flow

**Direct Dispatch rail action:**
When both `storeSettings.directDispatchEnabled` and `business.directDispatchEnabled` are true, an indigo `Direct Call` action appears in the left status rail on the orders screen. Tapping it opens the `DirectDispatchSheet` bottom sheet.

**`components/orders/DirectDispatchSheet.tsx`:**
Slide-up animated bottom sheet for requesting a driver on-demand. Shows an availability status banner (green when drivers are free, red when none available) plus preparation-time controls so dispatch can start before the order is ready. Form fields: recipient phone (required), recipient name (optional), preparation minutes (required), address (required), driver notes (optional). Submits `CreateDirectDispatchOrder` mutation. On success, closes the sheet and triggers an order list refetch. Drop-off coordinates are hardcoded to the Gjilan area (42.46, 21.47) as a placeholder; map picker support is deferred.

**`OrderCard` — Direct Dispatch display:**
- Orders with `channel === 'DIRECT_DISPATCH'` show an indigo "Direct Call" badge (phone icon) below the status badge in the card header
- Customer name/phone display uses `recipientName`/`recipientPhone` for direct dispatch orders instead of the user record

---

### `app/(tabs)/dashboard.tsx` — Dashboard Screen

Read-only analytics view derived entirely from client-side computation over raw order and product data.

**State:** `refreshing`; computed: `businessOrders`, `deliveredOrders`, `todayStats`, `weekRevenue`, `activeOrders`, `topProducts` (all `useMemo`)  
**Zustand:** `useAuthStore` (`user.businessId`)  
**GraphQL:**
- Query: `GET_BUSINESS_ORDERS` — polled every **30 s**
- Query: `GET_BUSINESS_PRODUCTS` — `variables: { businessId }`

**UI:**
- 4 `StatBox` cards: Today Orders, Active Orders, Today Revenue, Week Revenue
- Top 5 products by units sold (rank badge, image, name, units, revenue)
- Pull-to-refresh triggers both queries in parallel

**Computations (client-side only):**
- "Today" = `getStartOfToday()` filter on `orderDate`
- "Week" = `getStartOfWeek()` (Sunday-start)
- Top products = aggregate `quantity × unitPrice` across all `DELIVERED` orders per product across all order items

> **Note:** No dedicated analytics API query — all metrics are derived from the raw orders list in memory.

---

### `app/(tabs)/finances.tsx` — Finances Screen

Full financial dashboard: revenue, platform owed amounts, settlement records, per-category cost breakdown with drill-down, and pending settlement requests from admin.

**State (17 `useState`):**
- `period: 'today' | 'week' | 'month' | 'last_settlement' | 'custom' | 'all'`
- `customStart`, `customEnd` (DD/MM/YYYY), `customStartInput`, `customEndInput`, `customModalOpen`
- `refreshing`, `settlementOffset`, `loadingMore`
- `disputeModalRequestId`, `rejectReason`, `respondingId`
- `selectedSettlementOrder: SettlementOrderGroup | null` — order detail modal
- `selectedCategory` — category drill-down `{ category, label, color, direction }`
- `categorySettlements` — settlements fetched for selected category
- `highlightCategory` — category key to highlight in order detail modal

**Module-level types:**
- `BusinessSettlement` — alias for `GetMyBusinessSettlementsQuery['settlements'][number]`
- `SettlementOrderGroup` — `{ orderId, orderDisplayId, order, settlements, totalGross, totalReceivable, totalPayable, latestCreatedAt }`

**Zustand:** `useAuthStore` (`user.businessId`)

**GraphQL (all `fetchPolicy: 'network-only'`):**
- Query: `GET_LAST_BUSINESS_PAID_SETTLEMENT` — enables "From Last Settlement" period selector option
- Query: `GET_MY_SETTLEMENT_REQUESTS` — `{ status: 'PENDING', limit: 20 }` pending admin requests
- Query: `GET_MY_BUSINESS_SETTLEMENT_SUMMARY` — aggregated totals for selected period
- Query: `GET_MY_BUSINESS_SETTLEMENTS` — raw settlement rows with `reason` field, paginated (50/page)
- Query: `GET_BUSINESS_SETTLEMENT_BREAKDOWN` — per-category cost breakdown
- Lazy Query: `GET_MY_BUSINESS_SETTLEMENTS($category)` — fired when a breakdown row is tapped; populates category orders modal
- Mutation: `RESPOND_TO_SETTLEMENT_REQUEST` — accept/reject a request; reject requires a reason

**UI:**
- Horizontal-scroll period selector strip with 6 options ("Last Settlement" disabled if no paid settlement)
- **Revenue card** — gross income (computed client-side from settlement rows)
- **Owed card** — sum of PENDING/OVERDUE/PARTIALLY_PAID RECEIVABLE rows
- **Cost Breakdown section** — tappable category rows with icon, label, description, record count + "View Orders ›", and total
- **Category drill-down (3 layers):** (1) Tappable breakdown row fires lazy category query → (2) Category Orders Modal lists matching orders → (3) Order Detail Modal highlights matching settlement lines via `highlightCategory`
- Pending requests section with Accept / Reject buttons (reject opens reason modal)
- Paginated settlement records table (page size 50) with prev/next controls
- Custom range modal with DD/MM/YYYY text inputs and validation

**Helpers:**
- `getLineCategory(s)` — mirrors `SettlementRepository.buildCategoryCondition()` (uses `reason` field + rule type/promotion)
- `getCategoryColor(category, direction)` — direction-aware color map
- `getCategoryIcon(category)` — Ionicon name per category
- `getCategoryDescription(category)` — short i18n explanation shown under category label in breakdown rows

**Notable:** Revenue is computed locally from raw `GET_MY_BUSINESS_SETTLEMENTS` data using `calculateOrderItemSubtotal` (recursive, handles child items + selected options). Not from the summary API.

---

### `app/(tabs)/messages.tsx` — Messages Screen

Chat interface between the business and the admin platform.

**State:**
- `extraMessages` — subscription/mutation messages not yet in Apollo cache; persisted to `AsyncStorage` key `business_chat_extra_messages`
- `replyText`
- `clearedAt` — timestamp from `AsyncStorage` key `business_chat_cleared_at`
- `flatListRef` — for `scrollToEnd`

**GraphQL:**
- Query: `MY_BUSINESS_MESSAGES` — `{ limit: 100 }`, `cache-and-network`, polled every **30 s**
- Subscription: `BUSINESS_MESSAGE_RECEIVED_SUB` — real-time incoming messages from admin
- Mutation: `REPLY_TO_BUSINESS_MESSAGE` — send reply to specific admin
- Mutation: `MARK_BUSINESS_MESSAGES_READ_BUSINESS` — mark read when adminId is known

**Behaviors:**
- Messages merged from three sources: base query + `extraMessages` + deduplicated by ID
- `clearedAt` timestamp filters out messages older than last clear — persisted across restarts
- `useFocusEffect` triggers `refetch()` on every tab focus
- Date separator rows: "Today", "Yesterday", or locale date string
- Custom `parseDate()` normalizes PostgreSQL `"2026-03-24 10:30:00+00"` (replaces space with `T`) to fix iOS parsing
- Admin messages styled with `ALERT_CONFIG` colors (INFO/WARNING/URGENT); own messages right-aligned
- Read receipt dot on admin messages with `readAt`
- **Clear chat** — hides all messages via `clearedAt` timestamp; new messages still appear normally
- `KeyboardAvoidingView` for composer

---

### `app/(tabs)/products.tsx` — Products Screen

Full product catalog CRUD with category filtering.

**State:** `showFormModal`, `editingProduct`, `selectedCategory`, `submitting`, `refreshing`  
**Form state:** `formName`, `formDescription`, `formImageUrl`, `formPrice`, `formIsAvailable`, `formIsOnSale`, `formSalePrice`, `formCategoryId`  
**Zustand:** `useAuthStore` (`user.businessId`, permissions)  
**RBAC:** Entire screen guarded by `ManageProducts` — renders a lock screen if not permitted  

**GraphQL:**
- Query: `GET_BUSINESS_PRODUCTS` — returns products + `productCategories`
- Mutation: `CREATE_PRODUCT` — `refetchQueries: ['GetBusinessProducts']`
- Mutation: `UPDATE_PRODUCT` — `refetchQueries: ['GetBusinessProducts']`
- Mutation: `DELETE_PRODUCT` — `refetchQueries: ['GetBusinessProducts']`

**UI:**
- Category filter chips (horizontal scroll), "All" chip + per-category
- `FlatList` of product cards with `expo-image` thumbnail, availability `Switch`, on-sale badge
- Add/Edit modal: full product form — name, description, image URL, price, category picker, availability toggle, on-sale toggle with discount % field
- Inline availability toggle via `handleToggleAvailability` (immediate mutation, no modal)
- Delete confirmation `Alert.alert` with destructive style

**Notes:**
- Image URL is a plain text input (no image picker integration)
- Sale price stored as discount percentage (1–100%), not absolute value
- Haptics: light on availability toggle, success on save

---

### `app/(tabs)/settings.tsx` — Settings Screen

Account, business info, notification preferences, language, business hours, password change, and account deletion.

**State:** `passwordModalOpen`, `scheduleModalOpen`; password fields: `currentPassword`, `newPassword`, `confirmPassword`, `savingPassword`; schedule: `savingSchedule`, `dayStates: DayState[]` (7 days × `{ enabled, opensAt, closesAt }`)  
**Zustand:** `useAuthStore` (`user`, `logout`), `useLocaleStore` (`languageChoice`, `setLanguageChoice`), `useNotificationSettingsStore` (`pushEnabled`, `setPushEnabled`)  
**RBAC:** Entire screen guarded by `ManageSettings`  

**GraphQL:**
- Query: `GET_BUSINESS_SCHEDULE` — `fetchPolicy: 'network-only'`; populates `dayStates` via `useEffect`
- Mutation: `CHANGE_MY_PASSWORD`
- Mutation: `SET_MY_PREFERRED_LANGUAGE` — syncs with backend; rolls back `languageChoice` on error
- Mutation: `SET_BUSINESS_SCHEDULE` — replaces full week schedule in one call
- Mutation: `DELETE_MY_ACCOUNT`

---

### `app/(tabs)/settlement-history.tsx` — Settlement History Screen

Read-only settlement history view (exact implementation not deep-dived but accessible from tab bar for all authenticated users).

---

## Global Components

### `BusinessMessageBanner`

Full-screen modal-style overlay banner for admin-to-business messages. Blocks UI until dismissed.

**Props:** `senderName`, `body`, `alertType: 'INFO' | 'WARNING' | 'URGENT'`, `adminId: string | null`, `onDismiss: () => void`  
**Animation:** React Native `Animated` API — spring scale + opacity entrance; parallel timing exit  
**ALERT_CONFIG:** Maps `INFO/WARNING/URGENT` → colors, icons, labels  
**On tap:** fires `MARK_BUSINESS_MESSAGES_READ_BUSINESS`, dismisses, navigates to `/(tabs)/messages`  
**Backdrop:** Semi-transparent black (`rgba(0,0,0,0.65)`) animated overlay  

> **Note:** Uses legacy `Animated` API; rest of app uses Reanimated — inconsistency.

---

### `InfoBanner`

Simple inline status banner for informational, warning, or success states within page content.

**Props:** `message: string`, `type?: 'INFO' | 'WARNING' | 'SUCCESS'` (default INFO), `onDismiss?: () => void`  
Fully stateless and presentational. Dismiss button only renders when `onDismiss` is provided.

---

### `StoreClosedOverlay`

Full-screen blocking overlay when the business is temporarily closed. Prevents order acceptance and provides "Open Again" one-tap action.

**State (internal):** `isReminderVisible`, `closedSinceRef`, `appState`  
**GraphQL:** `GET_BUSINESS_OPERATIONS` polled every **15 s** (`cache-and-network`)  
**Animation:** Reanimated `withRepeat/withSequence/withTiming` breathing pulse on "Open Again" button  
**Reminder timer:** `REMINDER_INTERVAL_MS = 30 * 60 * 1000` — fires haptic + reminder modal after 30 min closed  
**AppState listener:** Resumes remaining reminder time correctly on foreground restore  

> **Bug:** `pointerEvents="box-none"` on outermost View lets touches pass through the blocking overlay — should be `"box-only"` or omitted.

---

## Stores (Zustand)

### `store/authStore.ts` — `useAuthStore`

Central authentication state.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `user` | `AuthUser \| null` | ✅ AsyncStorage (`business-auth-storage`) |
| `token` | `string \| null` | ❌ In-memory only |
| `isAuthenticated` | `boolean` | ❌ Computed |
| `hasHydrated` | `boolean` | ❌ |
| `authInitComplete` | `boolean` | ❌ |

**`AuthUser`:**
```ts
{ id, email, firstName, lastName, role, permissions?: UserPermission[], businessId: string | null, business?: Business }
```
**`Business`:** `{ id, name, imageUrl?, businessType, isActive }`

**Actions:**
- `login(user, token)` — sets both, recomputes `isAuthenticated`
- `logout(): Promise<void>` — deletes tokens from SecureStore, clears all state
- `updateUser(updates)` — partial merge
- `setToken(token)` — post-hydration token restoration
- `setAuthInitComplete(value)` — signals startup gate

**`isAuthenticated` conditions:** token must be non-null AND `role` must be `BUSINESS_OWNER | BUSINESS_EMPLOYEE` AND `businessId` must be set.

**Rehydration:** `onRehydrateStorage` sets `hasHydrated = true` even if state is null (first launch). After rehydration `isAuthenticated` is forced false until `setToken()` is called by `useAuthInitialization`.

---

### `store/useLocaleStore.ts` — `useLocaleStore`

Active language + loaded translation dictionary.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `languageChoice` | `'en' \| 'al'` | ✅ AsyncStorage (`business-locale-storage`) |
| `translations` | `Record<string, any> \| null` | ❌ Re-derived at runtime |

**Actions:**
- `setLanguageChoice(choice)` — updates language and immediately loads translations
- `loadTranslation()` — re-derives translations from stored `languageChoice`; call after rehydration

> **Bug:** No `onRehydrateStorage` callback calls `loadTranslation()`. On cold start with `'al'` persisted, translations initialize as English until `loadTranslation()` is explicitly called.

---

### `store/useNotificationSettingsStore.ts` — `useNotificationSettingsStore`

Push notification preference persistence.

**Fields:**

| Field | Type | Persisted |
|---|---|---|
| `pushEnabled` | `boolean` (default: true) | ✅ AsyncStorage (`business-notification-settings`) |

**Actions:** `setPushEnabled(enabled)`

---

## Hooks

### `hooks/useAuthInitialization.ts`

Bootstraps auth state on cold start. Runs once after Zustand hydration.

**Flow:**
1. Waits for `hasHydrated`
2. `hasInitialized` ref prevents re-run on re-renders
3. Calls `getValidAccessToken()` — reads from SecureStore
4. Validates: no token → `logout()`; no user → `logout()`; wrong role → `logout()`; no businessId → `logout()`
5. On success: `setToken(token)` + `setAuthInitComplete(true)`
6. Any error: `logout()` + `setAuthInitComplete(true)`

No server round-trip — validation is entirely client-side from persisted state.

---

### `hooks/useBusinessDeviceMonitoring.ts`

Real-time device health telemetry reporting.

**Constants:** `HEARTBEAT_INTERVAL_MS = 30_000`, `ORDER_SIGNAL_THROTTLE_MS = 4_000`

**Mutations:** `BUSINESS_DEVICE_HEARTBEAT`, `BUSINESS_DEVICE_ORDER_SIGNAL`  
**Subscription:** `ORDERS_SUBSCRIPTION` (for throttled order signals)

**Heartbeat payload:** `platform`, `batteryLevel` (clamped 0–100), `wsHealth` snapshot, `appState`  
**Heartbeat loop:** fires immediately on mount then every 30 s; clears when `isAuthenticated` = false  
**AppState listener:** ForEground/background transitions rebuild the heartbeat interval  
**Order signal throttle:** `lastOrderSignalAtRef` timestamp guard — minimum 4 s between signals  
**Device ID:** `resolveDeviceId()` using `Constants.installationId` with fallbacks to `sessionId` and `deviceName`

> **Note:** `networkType` is hardcoded `null` in heartbeat payload (placeholder).

---

### `hooks/useNotifications.ts`

Full FCM push notification lifecycle management.

**Mutations:** `REGISTER_DEVICE_TOKEN`, `UNREGISTER_DEVICE_TOKEN`, `TRACK_PUSH_TELEMETRY`

**`registerForPushNotifications()` steps:**
1. Skip on simulator (`!Device.isDevice`)
2. Guard against Firebase not initialized
3. Request permissions via `expo-notifications`
4. On iOS: `messaging().registerDeviceForRemoteMessages()`
5. Get FCM token via `messaging().getToken()`
6. If token matches `/^[a-fA-F0-9]{64}$/` (raw APNs token), wait 3 s and retry once

**Telemetry events tracked:** `TOKEN_REGISTERED`, `TOKEN_REFRESHED`, `TOKEN_UNREGISTERED`, `RECEIVED`, `OPENED`, `ACTION_TAPPED`

**Cleanup on `isAuthenticated = false`:** unregisters token from backend + sends `TOKEN_UNREGISTERED` telemetry

**Module-level side effect:** `Notifications.setNotificationHandler(...)` fires on module import — runs even in tests or SSR contexts.

---

### `hooks/useTranslation.ts`

Provides `t()` function backed by locale store.

**Returns:** `{ t: (path: string, fallback?: string, params?: Record<string, string | number>) => string }`

**`t()` behavior:**
- Resolves dot-notation path against `translations` object via `resolvePath()`
- Falls back to `fallback` then to `path` itself
- Replaces `{{ key }}` / `{{key}}` placeholders using `new RegExp(..., 'g')` per param

---

## GraphQL Operations

**Summary: 12 queries, 22 mutations, 2 subscriptions = 36 total operations**

> Codegen client: `orders.ts`, `products.ts`, `deviceHealth.ts`, `store.ts` use typed `graphql()` from `@/gql`. Others use `gql` from `@apollo/client` directly.

### Queries (12)

| Name | File | Purpose |
|---|---|---|
| `GetBusinessSchedule` | `business.ts` | Weekly operating schedule |
| `GetBusinessOperations` | `business.ts` | Operational flags: open/closed, avgPrepTime |
| `MyBusinessMessages` | `messages.ts` | Paginated business↔admin message thread |
| `GetBusinessOrders` | `orders.ts` | Full current orders list |
| `GetBusinessOrderReviews` | `orders.ts` | Paginated order reviews |
| `GetBusinessProducts` | `products.ts` | Products + categories for a business |
| `GetMyBusinessSettlements` | `settlements.ts` | Paginated/filtered settlement rows |
| `GetMyBusinessSettlementSummary` | `settlements.ts` | Aggregated financial summary |
| `GetLastBusinessPaidSettlement` | `settlements.ts` | Most recent paid settlement |
| `GetMySettlementRequests` | `settlements.ts` | Settlement requests from admin |
| `GetBusinessSettlementBreakdown` | `settlements.ts` | Categorized financial breakdown |
| `GetStoreStatus` | `store.ts` | Global store status / banner config |

### Mutations (22)

| Name | File | Purpose |
|---|---|---|
| `BusinessLogin` | `auth.ts` | Authenticate business user |
| `ChangeMyPassword` | `auth.ts` | Change account password |
| `SetMyPreferredLanguage` | `auth.ts` | Sync language preference to backend |
| `DeleteMyAccount` | `auth.ts` | Soft-delete user account |
| `SetBusinessSchedule` | `business.ts` | Replace full week operating schedule |
| `UpdateBusinessOperations` | `business.ts` | Update prep time / closure state |
| `BusinessDeviceHeartbeat` | `deviceHealth.ts` | Report device liveness |
| `BusinessDeviceOrderSignal` | `deviceHealth.ts` | Acknowledge order event on device |
| `ReplyToBusinessMessage` | `messages.ts` | Send reply to admin message |
| `MarkBusinessMessagesReadBusiness` | `messages.ts` | Mark messages from admin as read |
| `RegisterDeviceToken` | `notifications.ts` | Register FCM push token |
| `UnregisterDeviceToken` | `notifications.ts` | Deregister FCM push token |
| `TrackPushTelemetry` | `notifications.ts` | Record push notification telemetry |
| `UpdateOrderStatus` | `orders.ts` | Transition order status (READY / CANCELLED) |
| `StartPreparing` | `orders.ts` | Accept order with prep time |
| `UpdatePreparationTime` | `orders.ts` | Extend prep time on in-progress order |
| `RemoveOrderItem` | `orders.ts` | Remove item from live order with reason |
| `CreateProduct` | `products.ts` | Create new product |
| `UpdateProduct` | `products.ts` | Update existing product |
| `DeleteProduct` | `products.ts` | Soft-delete product |
| `CreateCategory` | `products.ts` | Create product category |
| `RespondToSettlementRequest` | `settlements.ts` | Accept or reject admin settlement request |

### Subscriptions (2)

| Name | File | Purpose |
|---|---|---|
| `AllOrdersUpdated` | `orders.ts` | Real-time order changes for this business |
| `BusinessMessageReceived` | `messages.ts` | Real-time incoming admin messages |

---

## Library Layer

### `lib/apollo.ts`

Singleton `ApolloClient` with split HTTP + WebSocket transport.

**Auth link:** Skips token injection for `BusinessLogin` (`AUTH_SKIP_OPERATIONS` set). Otherwise reads token via `getValidAccessToken()`.

**WS link:**
- `graphql-ws` via `GraphQLWsLink`
- `retryAttempts: Infinity`, `shouldRetry: () => true`
- Capped exponential backoff: `[1s, 2s, 5s, 10s]`
- `keepAlive: 30_000` pings every 30 s
- `connectionParams` fetches a fresh valid token on every reconnect

**WS health tracking:** `wsHealth` mutable object updated on `connected` / `closed` / `error` events. Exportable via `getWsHealthSnapshot()`.

**URL normalization:** Strips trailing `/graphql` so both forms of `EXPO_PUBLIC_API_URL` work.

**Default `fetchPolicy`:** `'cache-and-network'` for all watch queries.

**Cache persistence:** `apollo3-cache-persist` is installed but **not configured** — no cache persistence.

---

### `lib/authSession.ts`

JWT token lifecycle management.

**Exports:**
- `getStoredAccessToken()` — Zustand in-memory token → SecureStore fallback
- `getValidAccessToken(minValidityMs = 60_000)` — ensures ≥60 s validity before returning; triggers refresh if needed
- `refreshAccessToken(currentToken?)` — raw `fetch` token refresh (not Apollo); deduplicates concurrent calls via `refreshInFlight` promise

**JWT expiry decoding:** Base64url normalization + JSON parse via `buffer` package (no JWT library).

**On refresh success:** Saves to SecureStore + updates Zustand store  
**On 401/403 / UNAUTHENTICATED:** Deletes both tokens, clears Zustand — effective logout  
**On network error:** Returns current (possibly expired) token rather than null — avoids premature logout on transient failures

---

### `lib/rbac.ts`

Business-side RBAC utilities.

**Exports:**
- `isBusinessOwner(user)` — `user.role === 'BUSINESS_OWNER'`
- `hasBusinessPermission(user, permission: UserPermission)` — owners pass implicitly; staff checked against `user.permissions` array

---

## Utilities

### `utils/secureTokenStore.ts`

Platform-aware token persistence.

| Export | Storage |
|---|---|
| `saveToken` / `getToken` / `deleteToken` | SecureStore (native) / AsyncStorage (web) |
| `saveRefreshToken` / `getRefreshToken` / `deleteRefreshToken` | SecureStore (native) / AsyncStorage (web) |
| `deleteTokens` | `Promise.all([deleteToken(), deleteRefreshToken()])` |

Token keys: `'business_auth_token'`, `'business_refresh_token'`  
All operations wrapped in try/catch; `get*` return `null` on error; `save*` and `delete*` rethrow.

---

## Localization

Two locale files: `localization/en.json` and `localization/al.json` (~169 lines each).

**Supported languages:** English (`en`) and Albanian (`al`)  
**Translation provider:** `useTranslation()` hook backed by `useLocaleStore`  
**Translation persistence:** `languageChoice` persisted to AsyncStorage; dictionary re-derived at runtime  
**Language sync:** persisted via `SET_MY_PREFERRED_LANGUAGE` mutation on change; rolls back on error  
**Dot-notation paths:** `t('orders.newOrder')`, `t('settings.language.title')`, etc.  
**Param substitution:** `{{ key }}` / `{{key}}` pattern

---

## RBAC

Access control uses `lib/rbac.ts` + the `UserPermission` enum from generated GQL types.

**Roles:** `BUSINESS_OWNER` (all permissions) | `BUSINESS_EMPLOYEE` (subset)

**Permission enum values used in this app:**
- `ManageProducts` → Products tab + Products screen
- `ManageSettings` → Settings tab + Settings screen  
- `ViewAnalytics` → Dashboard tab + Finances tab

Tab bar hides inaccessible tabs. Screens render a lock UI if accessed without permission (defense in depth).

---

## Notification & Push Architecture

See M2 `MOBILE/PUSH_AND_LIVE_ACTIVITY.md` for platform-wide push architecture.

**Business-specific:**
- FCM token registered on login (or when `pushEnabled` toggles on) via `REGISTER_DEVICE_TOKEN`
- Token deregistered on logout / `pushEnabled = false` via `UNREGISTER_DEVICE_TOKEN`
- Background handler registered once via `globalThis.__businessBgMessageHandlerRegistered` guard
- Foreground messages: `expo-notifications` listener sends `RECEIVED` telemetry
- Notification taps: `OPENED` or `ACTION_TAPPED` telemetry
- New order audio: `beep.wav` (expo-av) plays 3× with 1 s gaps; repeats every 17 s while PENDING orders exist
- New order haptic: `Haptics.notificationAsync(Warning)`

---

## Device Health Telemetry

The business app reports two types of signals to the backend via `useBusinessDeviceMonitoring`:

| Signal type | Trigger | Throttle | Mutation |
|---|---|---|---|
| Heartbeat | Every 30 s while authenticated | — | `BusinessDeviceHeartbeat` |
| Order signal | On `AllOrdersUpdated` subscription event | Min 4 s between signals | `BusinessDeviceOrderSignal` |

**Heartbeat payload fields:** `platform`, `batteryLevel` (0–100), `wsHealth` snapshot, `appState`, `deviceId`  
**AppState transitions** trigger interval rebuild (intentional — fires immediate heartbeat on foreground restore).

---

## Order Sync Architecture

See M7 `MOBILE/ORDER_SUBSCRIPTION_SYNC_MB.md` for detailed subscription-first sync contract.

**Summary pattern for this app:**
1. `GET_BUSINESS_ORDERS` is the source of truth (polled at 15 s cadence in the tab bar, available in all tabs)
2. `AllOrdersUpdated` subscription fires on any order change → writes directly to Apollo cache via `apolloClient.cache.updateQuery`
3. If subscription update produces an empty result, `scheduleRefetch()` runs a debounced/throttled `refetch()`
4. `scheduleRefetch()` throttle: 1200 ms cooldown + 350 ms debounce
5. Tab bar badge re-computes automatically because it uses the same cached `GET_BUSINESS_ORDERS` query

---

## Optimization Recommendations

### Performance

| # | Area | Issue | Priority |
|---|---|---|---|
| P1 | Dashboard analytics | All stats computed client-side from raw order list — no dedicated analytics query. For large order histories this can cause unnecessary data transfer and heavy `useMemo` recalculation. | Medium |
| P2 | Settlement data | `GET_MY_BUSINESS_SETTLEMENTS` has `limit: 500` — fetches up to 500 settlement rows in one request. Should use cursor pagination or a lower bound. | High |
| P3 | Apollo cache | `apollo3-cache-persist` is installed but not configured. Cold starts always fetch fresh data. Adding persistence would improve perceived performance significantly. | Medium |
| P4 | Tablet layout | Tablet two-column layout is computed with `width >= 768` state inside the Orders screen on every render. Should use `useWindowDimensions` with `useMemo`. | Low |
| P5 | Orders screen re-renders | 28+ `useState` calls in a single screen component cause re-renders across the entire orders screen for every state change. Splitting into sub-components or using `useReducer` would reduce churn. | Medium |

### Code Quality

| # | Area | Issue | Priority |
|---|---|---|---|
| Q1 | `resolveDeviceId()` duplication | Identical function in `useNotifications.ts` and `useBusinessDeviceMonitoring.ts` — should be extracted to a shared utility. | Low |
| Q2 | `Notifications.setNotificationHandler` side effect | Called at module load time in `useNotifications.ts` — mutates global notification state on import, breaks test isolation. Move inside hook or app initializer. | Medium |
| Q3 | `apollo.ts` errorLink | Auth errors (401/403) only log to console — no automated re-auth or forced logout triggered from the error link. Relies on proactive `authLink` refresh but GraphQL-level auth errors are silently swallowed. | Medium |
| Q4 | Locale store cold start | `useLocaleStore` has no `onRehydrateStorage` callback to call `loadTranslation()`. Users with Albanian persisted see English on cold start until `loadTranslation()` is called explicitly. | High |
| Q5 | `StoreClosedOverlay` `pointerEvents` | `"box-none"` on the blocking overlay allows touch passthrough when the store is closed. Should be `"box-only"` or removed. | High |
| Q6 | Settlement GraphQL codegen split | Some operation files use typed `graphql()` from codegen client preset, others use raw `gql`. Standardize to one approach. | Low |
| Q7 | `REFRESH_TOKEN_MUTATION` hardcoded string | Token refresh mutation is a raw string literal in `authSession.ts` — not type-safe; schema changes won't surface as errors. | Low |

### Reliability

| # | Area | Issue | Priority |
|---|---|---|---|
| R1 | `useAuthInitialization` — client-only validation | No server round-trip to validate session. Stale/tampered user data in AsyncStorage can pass role and businessId checks. A `me` query on startup would catch revoked sessions. | Medium |
| R2 | `BusinessMessageBanner` uses legacy `Animated` | Rest of app uses Reanimated. Mixing animation APIs can cause subtle interaction conflicts. Migrate to Reanimated for consistency. | Low |
| R3 | Audio `beep.wav` error handling | No error path if `Audio.Sound.createAsync` fails — the pending-order alert would silently stop. Add catch and fallback to haptics only. | Medium |
| R4 | APNs token retry delay | 3-second hard-coded `setTimeout` in `registerForPushNotifications` blocks the async setup path. Use shorter delay or exponential backoff. | Low |
| R5 | `useBusinessDeviceMonitoring` AppState dep | `appState` in heartbeat effect deps causes the interval to be fully torn down and rebuilt on every foreground/background transition, not just value changes. Store appState in a ref and exclude from deps. | Low |

### Future Considerations

| # | Area | Suggestion |
|---|---|---|
| F1 | Analytics API | Add a dedicated analytics resolver on the backend returning pre-aggregated `todayOrders`, `todayRevenue`, `weekRevenue` etc. instead of computing from raw order lists client-side. |
| F2 | Product image picker | Replace the plain image URL text input with `expo-image-picker` + S3 upload for better operator UX. |
| F3 | Optimistic UI for order actions | Start/Prepare and Ready mutations currently show a loading state before the order card updates. Adding optimistic responses would feel more responsive. |
| F4 | Cache persistence | Wire up `apollo3-cache-persist` (already installed) to AsyncStorage. This would make cold starts feel instant with stale-while-revalidate behavior. |
| F5 | Offline indicator | No offline state detection. An `InfoBanner` on WS disconnect / Apollo network errors would improve operator confidence. |

---

## Dependency Graph

```
M13 (BUSINESS_APP.md)
  ├── A1 (ARCHITECTURE.md)
  ├── B1 (BACKEND/API.md)
  ├── B5 (BACKEND/AUTH_AND_USERS.md)
  ├── B7 (BACKEND/DATABASE_SCHEMA.md)
  ├── BL1 (SETTLEMENTS_AND_PROMOTIONS.md)
  ├── BL2 (PRODUCT_BUSINESS_CATEGORY_REFACTOR_FLOW.md)
  ├── BL6 (SETTLEMENT_KINDS.md)
  ├── M1 (MOBILE/OVERVIEW.md)
  ├── M2 (MOBILE/PUSH_AND_LIVE_ACTIVITY.md)
  ├── M7 (MOBILE/ORDER_SUBSCRIPTION_SYNC_MB.md)
  └── UI1 (ADMIN_MOBILEBUSINESS_UI_CONTEXT.md)
```
