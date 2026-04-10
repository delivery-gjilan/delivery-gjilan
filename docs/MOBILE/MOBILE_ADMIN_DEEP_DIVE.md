# Mobile Admin App — Deep Dive

<!-- MDS:M9 | Domain: Mobile | Updated: 2026-04-11 -->
<!-- Depends-On: M1, A1, B1, B4, BL1, UI2 -->
<!-- Depended-By: M1, M6 -->
<!-- Nav: Any mobile-admin screen change → update M6 tracker in same PR. -->

## Overview

`mobile-admin` is a React Native / Expo Router app targeted at **ADMIN** and **SUPER_ADMIN** roles. It is the mobile companion to the `admin-panel` web dashboard, focused on operational control from a phone: real-time order management, live driver tracking on a Mapbox map, admin push-to-talk signaling to drivers, and operational notification dispatch.

**Package directory:** `mobile-admin/`  
**Entry:** `mobile-admin/index.tsx`  
**Router:** Expo Router v3 (file-based, `app/` folder)  
**Graph API:** Apollo Client with subscriptions via `graphql-ws`  
**Map:** `@rnmapbox/maps`  
**Auth:** JWT stored in `expo-secure-store`; Zustand for in-memory state  
**Theme:** Dark/Light/System toggle via `useThemeStore` + NativeWind  
**i18n:** English / Albanian via `useLocaleStore`

---

## App Architecture

## Current Operational Scope

- Mobile-admin navigation is intentionally reduced to three operational tabs: `Map`, `Orders`, and `Ops`.
- `Map` and `Orders` are the primary dispatch surfaces.
- `Ops` contains admin-to-driver PTT controls and operational notification tools.
- Legacy admin-management surfaces (businesses, users, settlements, generic settings hub) are removed from the mobile-admin route surface.
- Push token registration remains active and operational order-alert notifications include:
    - new order arrival alerts
    - late pending alerts (pending/awaiting-approval orders crossing operational threshold)

---

## Route Shape (Current)

```
mobile-admin/app/
├── _layout.tsx
├── index.tsx
├── login.tsx
├── (tabs)/
│   ├── _layout.tsx          # Tab bar: Map | Orders | Ops
│   ├── map.tsx
│   ├── orders.tsx
│   └── ops.tsx
├── order/[orderId].tsx
└── ops-notifications.tsx
```

---

```
mobile-admin/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root: ApolloProvider, ThemeProvider, AuthGate
│   ├── index.tsx                # Entry redirect (auth → tabs)
│   ├── login.tsx                # JWT login
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar: Map | Orders | Dashboard | More
│   │   ├── map.tsx              # ★ Live map (drivers + active orders)
│   │   ├── orders.tsx           # ★ Orders list (all statuses, real-time)
│   │   ├── dashboard.tsx        # ★ Stats overview
│   │   └── more.tsx             # ★ Settings, navigation hub
│   ├── order/[orderId].tsx      # ★ Order detail (status mgmt, driver assign)
│   ├── driver/[driverId].tsx    # ★ Driver detail
│   ├── business/[businessId].tsx # ★ Business detail
│   ├── drivers.tsx              # Drivers list
│   ├── businesses.tsx           # Businesses list
│   ├── users.tsx                # Users list
│   ├── settlements.tsx          # ★ Settlements (driver + business, mark paid)
│   └── notifications.tsx        # ★ Push campaign management
├── graphql/
│   ├── orders.ts                # queries, mutations, subscriptions
│   ├── drivers.ts               # queries, mutations, subscriptions
│   ├── businesses.ts            # queries, mutations
│   ├── users.ts                 # queries, mutations
│   ├── notifications.ts         # device token, telemetry
│   └── misc.ts                  # store status, settlements, campaigns
├── components/
│   ├── StatCard.tsx             # KPI tile used on dashboard
│   ├── StatusBadge.tsx          # Order-status pill + FilterChip
│   ├── BottomSheet.tsx          # Modal sheet (driver picker, prep time)
│   ├── Button.tsx               # Themed button (primary/danger/secondary)
│   ├── Input.tsx                # Themed text input
│   ├── EmptyState.tsx           # Empty list placeholder
│   └── LoadingScreen.tsx        # Full-screen spinner
├── hooks/
│   ├── useTheme.ts              # Resolves dark/light theme object
│   └── useTranslations.ts       # Returns `t` translations object
├── store/
│   ├── authStore.ts             # Zustand auth (token + user)
│   ├── useThemeStore.ts         # Persisted theme choice
│   └── useLocaleStore.ts        # Persisted language choice
└── utils/
    ├── helpers.ts               # formatCurrency, formatDate, formatRelativeTime, getInitials
    ├── constants.ts             # ORDER_STATUS_COLORS, GJILAN_CENTER, GJILAN_BOUNDS
    └── mapbox.ts                # calculateRouteDistance (Mapbox Directions API)
```

---

## Screens

### 1. Dashboard (`(tabs)/dashboard.tsx`)

**Purpose:** At-a-glance KPIs for the running day.

**Data Sources:**
- `GET_ORDERS` → computed: `todayOrders`, `activeOrders`, `revenue`, `pendingCount`, `preparingCount`, `readyCount`, `deliveringCount`
- `GET_DRIVERS` → computed: `onlineDrivers`, `totalDrivers`

**Key stats rendered:**
| Stat | Source |
|------|--------|
| Today Orders | orders filtered by `orderDate >= today` |
| Active Orders | status in `[PENDING, PREPARING, READY, OUT_FOR_DELIVERY]` |
| Today Revenue | delivered orders' `totalPrice` sum |
| Online Drivers | `driverConnection.connectionStatus === 'CONNECTED'` |

**Recent Orders:** last 10 orders sorted by `orderDate` descending, each tappable → `/order/[id]`.

**Refresh:** pull-to-refresh triggers both `refetchOrders` and `refetchDrivers`.

---

### 2. Orders List (`(tabs)/orders.tsx`)

**Purpose:** Full filterable order list with real-time updates.

**Tab filters:** `ALL | PENDING | PREPARING | READY | OUT_FOR_DELIVERY | DELIVERED | CANCELLED`

**Real-time:** `ALL_ORDERS_SUBSCRIPTION` → Apollo cache patching via `updateQuery`. Throttled refetch fallback (1200 ms cooldown, 350 ms debounce) for subscription events without payload.

**Order card shows:**
- Status badge + relative time
- Business name(s) + item count
- Customer name
- Assigned driver name (if any)
- Total price
- Prep timer (if PREPARING + `estimatedReadyAt`)

**Tap** → `/order/[orderId]`

---

### 3. Live Map (`(tabs)/map.tsx`)

**Purpose:** Real-time spatial view of all active orders and all drivers.

**Libraries:** `@rnmapbox/maps`

**Data Sources:**
- `GET_ORDERS` + `ALL_ORDERS_SUBSCRIPTION` for active orders
- `GET_DRIVERS` + `DRIVERS_UPDATED_SUBSCRIPTION` for driver positions

**Map features:**
- Driver markers (circle with initials, green = online, grey = offline)
- Order markers for active orders by status (`PENDING`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`)
- Route visualization: for `OUT_FOR_DELIVERY` orders with an assigned driver — two polylines (driver→pickup, driver→dropoff) fetched from Mapbox Directions API
- Focused order panel: tap an order to expand a bottom panel showing route metadata (distance, ETA)
- Driver tracking: tap a driver to lock camera on their position
- Active orders sidebar pill-list on the left side

**Bounds:** Restricted to `GJILAN_BOUNDS`; camera snaps to `GJILAN_CENTER` on mount.

**Route cache key:** `${driver.lat},${driver.lng},${pickup.lat},${pickup.lng},${dropoff.lat},${dropoff.lng}` — avoids repeated Directions API calls.

---

### 4. More (`(tabs)/more.tsx`)

**Purpose:** Settings hub and navigation entry points.

**Sections:**
| Section | Items |
|---------|-------|
| STORE | Store open/closed toggle (mutation: `UPDATE_STORE_STATUS`) |
| MANAGEMENT | Businesses → `/businesses`, Drivers → `/drivers`, Users → `/users` |
| FINANCE | Settlements → `/settlements` |
| PUSH | Notification Campaigns → `/notifications` |
| PREFERENCES | Theme (light/dark/system cycle), Language (EN/AL) |
| ACCOUNT | Logout (clears `admin_auth_token` from SecureStore) |

---

### 5. Order Detail (`order/[orderId].tsx`)

**Purpose:** Full order management with all state transitions.

**Queries/Mutations:**
| Operation | Used for |
|-----------|----------|
| `GET_ORDER` | Load order |
| `GET_DRIVERS` | Driver picker |
| `UPDATE_ORDER_STATUS` | Status transitions |
| `START_PREPARING` | PENDING → PREPARING (sets prep time) |
| `UPDATE_PREPARATION_TIME` | Adjust prep time in PREPARING state |
| `CANCEL_ORDER` | Cancel with confirmation alert |
| `ASSIGN_DRIVER_TO_ORDER` | Assign/change driver |

**Status workflow:**
```
PENDING → (START_PREPARING) → PREPARING → (updateStatus) → READY → OUT_FOR_DELIVERY → DELIVERED
PENDING / PREPARING / READY → CANCELLED
```

**UI components:**
- Prep time bottom sheet (10/15/20/30/45/60 min chips)
- Driver assignment bottom sheet (scrollable driver list)
- Status action buttons adapt to current status

---

### 6. Settlements (`settlements.tsx`)

**Query:** `GET_SETTLEMENTS(type, status, limit, offset)` — supports `DRIVER` and `BUSINESS` settlement types.

**Fields shown per settlement:**
- Business/Driver name
- Amount (€)
- Status badge: Paid (green) / Unpaid (red)
- Created date

**Action:** "Mark Paid" button (mutation `MARK_SETTLEMENT_PAID`) with confirmation alert; only shown for unpaid settlements.

---

### 7. Drivers List + Detail (`drivers.tsx`, `driver/[driverId].tsx`)

**List:** each driver row shows initials, name/email, online status dot.

**Detail:**
- Profile (initials avatar, name, email, online status)
- Action buttons: Call, Toggle Online Status
- Activity stats: Active Orders count, Total Deliveries, Phone
- Active orders list (tappable → order detail)

**Mutations on detail:** `UPDATE_DRIVER_ONLINE_STATUS`

---

### 8. Businesses List + Detail (`businesses.tsx`, `business/[businessId].tsx`)

**List:** each business row shows initials, name, address, open/closed dot.

**Detail:** name, description, open/closed status, address, phone (tappable → `tel:`), coordinates, categories with product counts.

---

### 9. Users List (`users.tsx`)

Read-only list. Shows initials avatar, full name, email, role badge.

---

### 10. Notification Campaigns (`notifications.tsx`)

**Query:** `GET_NOTIFICATION_CAMPAIGNS`

**Per campaign:**
- Title + Body
- Status: Draft (amber) / Sent (green)
- Sent/created relative time
- "Send" button for Draft campaigns (mutation `SEND_CAMPAIGN` + confirmation)

---

## GraphQL Operations

### Orders Operations
| Operation | Type | Notes |
|-----------|------|-------|
| `GET_ORDERS` | Query | All orders, full fields including driver/user/businesses/locations |
| `GET_ORDER` | Query | Single order |
| `ALL_ORDERS_SUBSCRIPTION` | Subscription | Same shape as GET_ORDERS |
| `UPDATE_ORDER_STATUS` | Mutation | `id, status` |
| `START_PREPARING` | Mutation | `id, preparationMinutes` |
| `UPDATE_PREPARATION_TIME` | Mutation | `id, preparationMinutes` |
| `CANCEL_ORDER` | Mutation | `id` |
| `ASSIGN_DRIVER_TO_ORDER` | Mutation | `id, driverId` |
| `CREATE_TEST_ORDER` | Mutation | Debug only |

### Drivers Operations
| Operation | Type | Notes |
|-----------|------|-------|
| `GET_DRIVERS` | Query | All fields incl. `driverConnection`, `driverLocation` |
| `DRIVERS_UPDATED_SUBSCRIPTION` | Subscription | Same shape |
| `ADMIN_UPDATE_DRIVER_SETTINGS` | Mutation | commission %, maxActiveOrders |
| `ADMIN_UPDATE_DRIVER_LOCATION` | Mutation | lat/lng |
| `UPDATE_DRIVER_ONLINE_STATUS` | Mutation | `isOnline` |

### Misc Operations
| Operation | Type | Notes |
|-----------|------|-------|
| `GET_STORE_STATUS` | Query | `isStoreClosed`, `closedMessage` |
| `UPDATE_STORE_STATUS` | Mutation | `UpdateStoreStatusInput` |
| `GET_SETTLEMENTS` | Query | type/status/limit/offset filters |
| `MARK_SETTLEMENT_PAID` | Mutation | `settlementId` |
| `GET_NOTIFICATION_CAMPAIGNS` | Query | |
| `SEND_CAMPAIGN` | Mutation | `id` |
| `CREATE_CAMPAIGN` | Mutation | `CreateCampaignInput` |

---

## Auth Model

- Token stored via `expo-secure-store` key `admin_auth_token`
- On app start, root `_layout.tsx` checks token; redirects to `/login` if absent
- Login mutation: `LOGIN_ADMIN` — on success stores token + sets `useAuthStore`
- Logout: deletes secure-store key, resets Zustand, navigates to `/login`
- Role check: not currently enforced client-side per-screen (assumed network-level)

---

## Real-time Architecture

Uses the same WebSocket subscription topology as the rest of the platform (see A1 and B1 for server details):
- `allOrdersUpdated` → cache patch then selective refetch
- `driversUpdated` → selective refetch

Both subscriptions use a throttled refetch helper (1200 ms cooldown, 350 ms debounce timer) to prevent floods during reconnect.

---

## Theme System

| Mode | Background | Card | Text | Primary |
|------|-----------|------|------|---------|
| Light | `#F8FAFC` | `#FFFFFF` | `#1f2937` | `#7C3AED` |
| Dark | `#000000` | `#1A1A1A` | `#FFFFFF` | `#7C3AED` |

Persisted in AsyncStorage via `useThemeStore` (3-way: `light | dark | system`).

---

## i18n

Supported: `en` (English), `al` (Albanian). Persisted via `useLocaleStore`. Translation keys cover: `dashboard.*`, `orders.*`, `tabs.*`, `more.*`, `common.*`.

---

## Refactor Candidates

See M6 (`ADMIN_PANEL_MOBILE_REFACTOR_TRACKER.md`) for the parity backlog. Key open items:

1. **Financial module parity** — `/admin/financial/*` from web panel not yet in mobile-admin.
2. **Earnings signal on orders** — `+earnings` breakdown per order not yet shown.
3. **Settlement filters** — date modes (today, this week, this month, from last settlement, custom) need to match web.
4. **Permission-gated screens** — role/permission checks not yet enforced client-side.
5. **Business creation/editing** — CRUD mutations exist in GraphQL layer but no create/edit forms in UI.
6. **User management actions** — create/update/delete user forms missing (only read view exists).

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@rnmapbox/maps` | Map rendering + GPS markers |
| `@apollo/client` | GraphQL + subscriptions |
| `graphql-ws` | WebSocket subscription transport |
| `expo-secure-store` | JWT token storage |
| `zustand` | State management |
| `nativewind` | Tailwind class utility for RN |
| `expo-router` | File-based routing |
| `@expo/vector-icons` | Ionicons |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-gesture-handler` | Bottom sheet gestures |
