# Admin Panel — Deep Dive (W1)

**MDS ID:** W1  
**Last updated:** 2026-04-14  
**Path:** `admin-panel/`  
**Relates to:** M9 (mobile-admin deep dive), M6 (admin panel ↔ mobile-admin parity tracker), UI1, UI2, BL1–BL5, A1

---

## 1. Overview

The admin panel is a **Next.js 16 (App Router) web application** targeting platform administrators, operations staff, and business operators. It is the primary control surface for the Zipp delivery platform and provides:

- Real-time order management and map-based dispatching
- Business and product catalog management
- Driver fleet management
- Push notification campaigns
- Settlement and financial management
- System configuration (delivery zones, pricing tiers, store status)
- Audit logs, operational monitoring (Ops Wall)
- Admin user and permissions management (SUPER_ADMIN only)

It shares the same GraphQL API as the mobile apps and uses WebSockets for live subscriptions.

---

## 2. Technology Stack

| Category | Library / Version |
|---|---|
| Framework | Next.js 16.0.7, React 19 |
| Bundler | Turbopack (`next dev --turbopack`) |
| GraphQL client | Apollo Client 3.14 + `graphql-ws` |
| Codegen | `@graphql-codegen` (operations → typed hooks) |
| Maps | `mapbox-gl`, `react-map-gl/mapbox`, `@mapbox/mapbox-gl-draw` |
| PTT | `agora-rtc-sdk-ng` 4.24 |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| UI | shadcn-ui, `sonner` (toast), `lucide-react`, Tailwind CSS |
| Charts | `recharts` (imported, not yet wired to real data) |
| Tables | `@tanstack/react-table` |
| Forms | `react-hook-form` + `zod` |
| Data fetching | `@tanstack/react-query` (installed, limited use) |
| Date utils | `date-fns`, `react-date-range` |
| Language | TypeScript 5 |

---

## 3. Project Structure

```
admin-panel/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root shell (Providers, Mapbox CSS)
│   │   ├── page.tsx                 # Auth redirect guard
│   │   ├── providers.tsx            # Apollo + Auth + Toaster providers
│   │   ├── login/
│   │   │   └── page.tsx             # Login form
│   │   ├── dashboard/               # Main authenticated route group
│   │   │   ├── layout.tsx           # Auth guard, role access, Sidebar, Topbar, PTT shell
│   │   │   ├── page.tsx             # Redirect (business→statistics, else→orders)
│   │   │   ├── orders/page.tsx      # Primary order management
│   │   │   ├── map/page.tsx         # Real-time dispatching map
│   │   │   ├── drivers/page.tsx     # Driver fleet management
│   │   │   ├── businesses/
│   │   │   │   ├── page.tsx         # Business CRUD list
│   │   │   │   └── [id]/page.tsx    # Business detail + products
│   │   │   ├── users/page.tsx       # Customer/user management
│   │   │   ├── promotions/page.tsx  # Promotion CRUD
│   │   │   ├── promotions/analytics/page.tsx # Promotion usage/loss analytics
│   │   │   ├── statistics/page.tsx  # Statistics (placeholder only)
│   │   │   ├── notifications/page.tsx # Push notification campaigns
│   │   │   ├── logs/page.tsx        # Audit log viewer
│   │   │   ├── products/page.tsx    # Product management entry (business picker)
│   │   │   ├── categories/page.tsx  # Category + subcategory management
│   │   │   ├── delivery-zones/page.tsx # Zone polygon CRUD on Mapbox map
│   │   │   ├── delivery-pricing/page.tsx # Distance-tier pricing config
│   │   │   ├── admins/page.tsx      # Admin/business user CRUD
│   │   │   ├── inventory/page.tsx   # Market inventory management
│   │   │   ├── finances/page.tsx    # Redirect → /admin/financial/settlements
│   │   │   ├── business-settlements/page.tsx # Business-facing settlements view
│   │   │   ├── productpricing/page.tsx # Per-product markup pricing
│   │   │   ├── ops-wall/page.tsx    # Operational health dashboard
│   │   │   └── market/page.tsx      # Market product/category full management
│   │   ├── admin/                   # SUPER_ADMIN-only route group
│   │   │   ├── layout.tsx           # SUPER_ADMIN gate
│   │   │   ├── banners/page.tsx     # Banner CRUD with leaderboard
│   │   │   ├── featured/…           # Featured businesses management
│   │   │   ├── financial/
│   │   │   │   └── settlements/…    # Full financial settlements UI
│   │   │   ├── messages/page.tsx    # Admin ↔ driver/business messaging center
│   │   │   └── promos/
│   │   │       ├── page.tsx         # Promotion list/delete
│   │   │       ├── create/          # Create promotion form
│   │   │       └── [id]/edit/       # Edit promotion form
│   │   └── api/
│   │       └── directions/          # (directory present, route.ts absent)
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx          # Role-filtered navigation sidebar
│   │   │   ├── topbar.tsx           # Store controls + user actions
│   │   │   ├── GlobalPttOverlay.tsx # Floating PTT status indicator
│   │   │   └── PermissionSelector.tsx # Permission checkbox grid
│   │   ├── businesses/
│   │   │   ├── CategoriesBlock.tsx  # Category CRUD + drag reorder
│   │   │   ├── ProductsBlock.tsx    # Product CRUD + options + catalog adoption
│   │   │   ├── ScheduleEditor.tsx   # Weekly hours editor
│   │   │   └── SubcategoriesBlock.tsx
│   │   ├── inventory/
│   │   │   └── InventoryCoverageModal.tsx
│   │   ├── notifications/           # (components for notifications page)
│   │   └── ui/                      # shadcn-ui primitives (14 components)
│   ├── graphql/
│   │   └── operations/              # 138 typed GraphQL operations
│   ├── lib/
│   │   ├── graphql/
│   │   │   └── apollo-client.ts     # Apollo config: HTTP+WS split, JWT refresh
│   │   ├── auth-context.tsx         # React Context for auth state
│   │   ├── route-access.ts          # Role → allowed path mapping
│   │   ├── utils.ts                 # cn() Tailwind merge helper
│   │   ├── avatarUtils.ts           # Avatar initials + color hash
│   │   ├── hooks/
│   │   │   ├── useAdminPtt.tsx      # Agora PTT context + hooks
│   │   │   ├── useOrders.ts         # Order query/subscription + alerts
│   │   │   ├── useMapRealtimeData.ts # Driver/order/business realtime for map
│   │   │   ├── useOrderRouteDistances.ts # Per-order Mapbox route calc
│   │   │   ├── usePrepTimeAlerts.ts # Prep-time overrun alert hook
│   │   │   ├── useBusinesses.ts     # Business CRUD hooks
│   │   │   ├── useProducts.ts       # Product + category hooks
│   │   │   ├── useProductCategories.ts
│   │   │   └── useProductSubcategories.ts
│   │   └── audio/
│   │       └── orderAlert.ts        # New-order beep (AudioContext + fallback)
│   └── hooks/
│       └── use-toast.ts             # Sonner toast wrapper
```

---

## 4. Authentication & Role System

### Auth Flow

1. Login form (`/login`) calls `useAuth().login` → `Login` mutation → JWT + refresh token stored in `localStorage` as `authToken` / `refreshToken`.
2. `AuthProvider` (`auth-context.tsx`) reads from `localStorage` on mount and sets `isAuthenticated`, `admin`, `authCheckComplete`.
3. Apollo Client (`apollo-client.ts`) injects the JWT as `Authorization: Bearer …` header on every GraphQL request.
4. Proactive token refresh: Apollo intercepts `UNAUTHENTICATED` errors → calls inlined `RefreshToken` mutation → retries original operation.

### Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | All routes including `/admin/*` |
| `ADMIN` | All `dashboard/*` routes except designated super-admin paths |
| `BUSINESS_OWNER` | `/dashboard/orders`, `/dashboard/categories`, `/dashboard/products`, `/dashboard/business-settlements` |
| `BUSINESS_EMPLOYEE` | Same as `BUSINESS_OWNER`, further restricted by `UserPermission` flags |

Role access is enforced in two places:
- `dashboard/layout.tsx` → calls `canAccessAdminPanelPath(role, pathname)` from `route-access.ts`
- `admin/layout.tsx` → hard-gates on `role === 'SUPER_ADMIN'`

### Auth Token Storage

Auth token is stored in `localStorage`. Several pages read it directly for REST calls (`ops-wall/page.tsx`, `businesses/page.tsx` for image upload). This is a security concern — see §11.

---

## 5. GraphQL & Apollo Configuration

### Apollo Client Setup (`apollo-client.ts`)

- **Split link:** HTTP link for queries/mutations, WebSocket link (`graphql-ws`) for subscriptions.
- **Auth header:** Inlined via `authLink` — reads `localStorage.getItem('authToken')` on every request.
- **Error handling:** `onError` link intercepts `UNAUTHENTICATED` → triggers token refresh → retries. Other errors fire a Sonner toast.
- **Debug instrumentation:** order-related operations now emit structured console logs from `errorLink` (`[GraphQL][Orders] ...`) including operation name, variables, GraphQL error code/path, and network status to speed up cross-surface order incident triage.
- **Token refresh:** Dedicated `refreshTokenLink` calls an inlined `RefreshToken` mutation (not exported as a named operation constant).
- **Cache:** `InMemoryCache` with default config — no explicit type policies or field merge configuration.

### Operation Totals

| Type | Count |
|---|---|
| Queries | 51 |
| Mutations | 82 |
| Subscriptions | 5 |
| **Total** | **138** |
| + internal (apollo-client.ts) | 1 (`RefreshToken` inlined) |

### Active Subscriptions

| Name | Domain | Consumer |
|---|---|---|
| `OrdersUpdated` (`userOrdersUpdated`) | orders | `useOrders`, `map/page` |
| `DriversUpdated` | users | `drivers/page`, `useMapRealtimeData` |
| `AdminMessageReceived` | driverMessages | `map/page`, `admin/messages` |
| `AdminBusinessMessageReceived` | businessMessages | `map/page`, `admin/messages` |
| `AdminPttSignal` | users/ptt | `useAdminPtt` |

---

## 6. Pages — Dashboard Route Group

### `/dashboard/orders` — Order Management

The most complex page. Manages the full active + completed order pipeline.

**State:** ~15 `useState` flags for modals, form state, clipboard; paginated lists (`PAGE_SIZE=100` active, `PAGE_SIZE=50` completed); `useMemo` for filtered/sorted lists; `useRef` for poll intervals and scroll containers.

**GraphQL:** 10 mutations (assign driver, create test order, start preparing, update prep time, cancel, approve, remove item, grant free delivery, update user note, deduct stock), 1 query (drivers for assign modal), 1 lazy query (order coverage).

**Key features:**
- STATUS_FLOW map drives "next status" button.
- Approval modal for flagged orders (`FIRST_ORDER`, `HIGH_VALUE`, `OUT_OF_ZONE`). Suppressible via `[SUPPRESS_APPROVAL_MODAL]` marker in `adminNote`.
- Trusted customer detection via `[TRUSTED_CUSTOMER]` adminNote marker, `isTrustedCustomer` field, or green `flagColor`.
- Order cancellation uses shared `CancelOrderModal` with required reason, category tagging (`CUSTOMER_REQUEST`, `BUSINESS_ISSUE`, `DRIVER_ISSUE`, `LOGISTICS`, `SYSTEM`), quick-reason presets, and optional settlement toggles (`settleDriver`, `settleBusiness`) before calling `AdminCancelOrder`.
- Cancellation reason rendering in order detail/table and cancelled-orders list parses the tag prefix and shows a category badge with clean reason text.
- Inventory coverage modal showing stock vs. market fulfillment.
- Incident tagging (JSON stored in `adminNote`).
- `usePrepTimeAlerts` for overrun notifications.
- Active/completed list normalization, settlement preview rows, and inventory coverage modal props are aligned with generated GraphQL nullability through shared typed order models.
- Order cards/tables show a compact promo-applied indicator only; detailed promotion rows and amounts are shown in the order details modal.
- The `Mock Order` action emits explicit click/success/failure console traces (`[Orders][MockOrder] ...`) so a button press can be correlated with subsequent GraphQL/network logs.

### `/dashboard/map` — Live Dispatching Map

The most complex visual page. Full-screen Mapbox GL map with driver positions, order overlays, chat panels, PTT.

**State:** Map viewport, selected driver/order, sidebar/panel open+mode, incident notes (localStorage `admin.map.incidentNotes.v1`), filter states.

**GraphQL:** 13 mutations, 3 queries, 3 lazy queries, 3 subscriptions (orders, driver messages, business messages).

**Key features:**
- Driver position interpolation with exponential smoothing at ~30 FPS (`ANIMATION_COMMIT_INTERVAL_MS=33`).
- Teleport guard (`DRIVER_TELEPORT_GUARD_METERS=800`) and GPS jitter dead zone (`DRIVER_JITTER_DEAD_ZONE_METERS=5`).
- Adaptive gap timing: `500ms` → `15000ms` based on update frequency.
- Per-driver/order warning thresholds: PENDING >2min, READY >3min, OUT_FOR_DELIVERY >10min.
- Status-to-cancel transition opens the same `CancelOrderModal` used in Orders, keeping reason capture and settlement decisions consistent across both pages.
- Driver/business chat panels with unread count tracking.
- Core map helpers (trust markers, approval reasons, ETA fallback, status timing, and auto-assign/status action handlers) now use explicit local user/order/driver shape aliases instead of raw `any` parameters.
- Render-layer typing cleanup is applied through map markers, right-panel cards, driver/business/chat panes, approval modal, and bottom detail helper components, with local shape aliases covering settlement preview and inventory badges instead of broad `any` casts.
- `// @ts-nocheck` — entire file bypasses TypeScript type safety.

### `/dashboard/drivers` — Driver Fleet

**State:** Local driver list for subscription merging, search, modal open flags, multi-select for PTT.

**GraphQL:** `DRIVERS_QUERY`, `DRIVERS_UPDATED_SUBSCRIPTION`, 4 mutations (register, delete, update settings, update user). `DRIVER_REGISTER_MUTATION` is defined **inline with `gql`** rather than in the operations folder.

**Key features:** Real-time status via subscription merge. Connection status badges (CONNECTED/STALE/LOST/DISCONNECTED). Battery level display. Multi-select for PTT broadcast. Settings modal (commission %, max orders, isDemoAccount).

### `/dashboard/businesses` — Business CRUD

**GraphQL:** `GET_BUSINESSES`, `CREATE_BUSINESS`, `CREATE_BUSINESS_WITH_OWNER`, `UPDATE_BUSINESS`, `DELETE_BUSINESS`.

**Key features:** Image upload via `FormData` POST to `/api/upload` REST endpoint (not GraphQL). Auth token read from `localStorage` for upload. `ScheduleEditor` for per-day hours. `createOwnerNow` toggle creates business + owner in one mutation.

**Issues:** `// @ts-nocheck`. Auth token directly read from `localStorage`.

### `/dashboard/businesses/[id]` — Business Detail

**GraphQL:** `GET_BUSINESS`, `UPDATE_BUSINESS`.

**Issues:** `editForm.businessType` defaults to `BusinessType.Restaurant` unconditionally on modal open — overwrites existing type on save.

### `/dashboard/users` — Customer Management

**Layout:** Toggle between two views via tab buttons at the top:

**User List view (default):** Master-detail split-pane. Left panel shows a searchable customer list (sorted by signup date desc) with avatar initials (flag-color-ringed when flagged), status icons (banned/trusted/demo), and flag dots. Clicking a user opens a right-side detail panel; the list shrinks to 380 px. The selected user is derived from live query data so the panel auto-refreshes after mutations.

**Detail panel tabs:**
- **Overview:** Flag & Notes card (5-level color picker: none/green/yellow/orange/red with inline edit), Customer Info card (email, phone, address, user ID).
- **Orders & Stats:** Behavior Summary stats grid (total/delivered/cancelled orders, total spend, avg order, last delivered — super-admin only), clickable order list opening an Order Details modal.

**Actions bar:** Edit (opens create/edit modal), Ban/Unban (confirmation modal), Delete (confirmation modal). All super-admin only.

**Statistics view:** Signup analytics dashboard showing:
- **Summary cards:** Total new users, users with orders (%), users without orders (%), completed signups (%), pending signups (%).
- **Signup Trend Chart:** LineChart showing new user count per day over the selected date range.
- **Filters:** Date range (7d/30d/90d/all), user status (all/new-only/with-orders/without-orders).
- **New Users List:** Sortable list of new users in the filtered range with signup date, order count, and completion status.

**GraphQL:** `USERS_QUERY` (includes `createdAt`, `totalOrders`, `signupStep`, `emailVerified`, `phoneVerified`), `GET_ORDERS` (lazy, loads on Orders tab), `USER_BEHAVIOR_QUERY` (lazy, super-admin only), 5 mutations (`createUser`, `updateUser`, `deleteUser`, `updateUserNote`, `banUser`). All mutations refetch — no cache updates.

**Key features:** 5-color flag system with inline note editing. `isBanned` column blocks ordering (backend). `isTrustedCustomer` skips FIRST_ORDER and HIGH_VALUE approval. Ban/unban with confirmation. Search by name, email, or phone. Only CUSTOMER-role users shown (drivers managed separately). Signup date-based analytics and charting via `recharts` LineChart.

**New Implementation (Apr 2026):** Statistics tab added with full signup trend analysis, date-range and status filters, and user list filtering by signup cohort and order activity.

### `/dashboard/promotions` — Promotion Management

**GraphQL:** `GET_PROMOTIONS`, `GET_RECOVERY_PROMOTIONS`, `GET_BUSINESSES`, `USERS_QUERY`, 5 mutations. `ASSIGN_PROMOTION_TO_USERS` is imported from `notifications` operations (semantic mismatch).

**Key features:** Six promotion types with conditional field visibility. `driverPayoutAmount` for delivery-fee promos. `creatorType` (PLATFORM/BUSINESS). Quick-code modal. User assign flow (pick users → assign promo). Recovery promotions tab. Promotions list status shows global usage progress (`used/limit` + `remaining`) and marks exhausted promos as `Limit reached`.

### `/dashboard/promotions/analytics` — Promotion Usage & Loss Analytics

**GraphQL:** `GET_PROMOTIONS_ANALYTICS` (`getPromotionsAnalytics` query).

**Key features:** Date-range filters (`from`, `to`), status filter (active/inactive/all), optional inclusion of recovery promotions, summary cards (total deducted, platform-paid, business-paid, usage/users), view tabs (`Breakdown`, `Trends`), sortable-by-default table (highest deducted first), and per-promotion breakdown columns: total deducted, price-discount deducted, delivery deducted, free-delivery usage count, average order value, and creator attribution (platform/business + creator name when business-owned). Trends view renders two daily charts from `dailyPoints`: deductions split by payer and usage vs unique users.

### `/dashboard/statistics` — Statistics

**Status: Entirely placeholder.** All values are hardcoded strings. `recharts` is installed but no real data is fetched. Date range selector has no effect.

### `/dashboard/notifications` — Push Campaigns

**GraphQL:** `GET_NOTIFICATION_CAMPAIGNS`, `PREVIEW_CAMPAIGN_AUDIENCE` (lazy), `USERS_QUERY`, `GET_ALL_PROMOTIONS`, 6 mutations.

**Key features:**
- `QueryBuilder` for audience rule-group construction (AND/OR, fields: role, totalSpend, lastOrderAt).
- 5 audience presets (All Customers, All Drivers, Business Owners, High Value, Dormant).
- `PushPreview` mock iOS bubble.
- Bilingual fields (`titleAl`, `bodyAl` for Albanian).
- Campaign categories: `promotion`, `general`, `order-on-the-way`, etc.
- Recovery promotion issuance from the notifications tab.
- Query, lazy-query, and mutation call sites consume generated GraphQL result/variable types even though the notifications operations file still uses legacy `gql` documents.

### `/dashboard/logs` — Audit Logs

**GraphQL:** `GET_AUDIT_LOGS` (`fetchPolicy: 'network-only'`, page size 50). Filterable by action (17 types), entity (8 types), actor (5 types), date range.

**Key features:** `formatMetadataPreview(action, metadata)` — action-aware. `getActionColor` and `getActorBadge` for visual coding. Expandable rows showing raw `metadata` JSON. Metadata shaping in preview/details renderers uses local typed metadata aliases (including diff-oriented `oldValue`/`newValue`) instead of explicit `any` annotations.

Current typing state across nearby admin routes: `/dashboard/admins` and `/dashboard/users` role payloads are cast to `UserRole` (instead of raw `any`) when sending update mutations; `/dashboard/delivery-pricing` save error handling treats thrown values as `unknown` with safe message extraction; `/dashboard/finances/page-new` reads settlements from query data without `as any`; and `lib/utils/cn` accepts `ClassValue[]` for class composition. In adjacent admin surfaces, `/admin/messages` alert-style lookup returns a typed style object without `as any`, `/dashboard/inventory/earnings` summary cards use typed inventory earnings query output, `components/ui/Table` header/cell pass-through props are typed via `React.ThHTMLAttributes` / `React.TdHTMLAttributes`, and `/admin/featured` query/mutation cache-update paths consume typed GraphQL payloads without `as any`.

### `/dashboard/products` — Product Management Entry

Business picker for admins; business users go directly to their own products. Delegates to `<ProductsBlock>`.

### `/dashboard/categories` — Category Management

Business picker + `<CategoriesBlock>` + `<SubcategoriesBlock>`. **Note:** `GET_BUSINESSES` is fetched even for business users (no `skip`) — unlike `products/page.tsx` which correctly skips it.

### `/dashboard/delivery-zones` — Zone CRUD

**GraphQL:** `GET_DELIVERY_ZONES`, `CREATE_DELIVERY_ZONE`, `UPDATE_DELIVERY_ZONE`, `DELETE_DELIVERY_ZONE`.

**Key features:** Mapbox GL + `MapboxDraw` for polygon editing directly on the map. `isServiceZone` flag. 8 preset zone colors. Zone list panel. Bounds fitted to Gjilan area.

### `/dashboard/delivery-pricing` — Distance Pricing Tiers

**GraphQL:** `GET_DELIVERY_PRICING_TIERS`, `SET_DELIVERY_PRICING_TIERS` (replaces full tier set).

**Key features:** Editable tier table (min/max km, price). Auto-fill neighbor min. Client-side validation. Default tiers seeded if backend returns empty.

### `/dashboard/admins` — Admin User Management

**GraphQL:** `USERS_QUERY`, `CREATE_USER_MUTATION`, `UPDATE_USER_MUTATION`, `DELETE_USER_MUTATION`, `SET_USER_PERMISSIONS`, `GET_BUSINESSES`.

**Key features:** Manage `SUPER_ADMIN`, `ADMIN`, `BUSINESS_OWNER`, `BUSINESS_EMPLOYEE` accounts. `<PermissionSelector>` for employee permissions (5 groups: Orders, Products, Financial, Settings, Analytics). Two-step for `BUSINESS_EMPLOYEE`: create + separate `SET_USER_PERMISSIONS` mutation. `console.log('[DEBUG]')` calls present.

### `/dashboard/inventory` — Market Inventory

**GraphQL:** `GET_STORE_STATUS`, `UPDATE_STORE_STATUS`, `GET_MY_INVENTORY`, `GET_INVENTORY_SUMMARY`, `SET_INVENTORY_QUANTITY`, `REMOVE_INVENTORY_ITEM`. `BULK_SET_INVENTORY` imported but unused.

**Key features:** Finds the single `MARKET`-type business automatically. Inventory mode toggle. Summary stats (tracked count, stock value, low-stock, out-of-stock). Search + filter pills. Quick +/- quantity adjust. Edit modal for quantity/costPrice/threshold.

### `/dashboard/finances` → redirects to `/admin/financial/settlements`

### `/dashboard/business-settlements` — Business-Facing Settlements

**GraphQL:** `GET_SETTLEMENTS_PAGE`, `GET_BUSINESS_BALANCE`, `GET_SETTLEMENT_REQUESTS`, `CREATE_SETTLEMENT_REQUEST`.

**Key features:** Balance summary cards (total, pending, paid out). Settlement request dialog. Order-grouped settlement rows with per-order financial breakdown modal (`GET_BUSINESS_ORDER_FINANCIALS`). Client-side filter/search on up to 200 records. `fetchPolicy: 'cache-and-network'` for balance + settlements.

**Issues:** Client-side search with no server-side filtering for search terms.

### `/dashboard/productpricing` — Product Markup Pricing

**GraphQL:** Inline `graphql()` tagged operations (`BusinessesForMarkup`, `ProductsForMarkup`, `UpdateProductMarkup`) — **inconsistent with rest of codebase** which uses separate operation files.

**Key features:** Custom searchable business dropdown. Products flattened from variant groups. `DeltaBadge` showing markup vs base price. `markupPrice` + `nightMarkedupPrice` per product.

### `/dashboard/ops-wall` — Operational Health Monitor

**REST-only page** — bypasses Apollo entirely. Polls `/health/ops-wall` every 10 seconds via `fetch()`. Auth token read from `localStorage`.

**Key features:**
- SLO status badge (ok/degraded/critical).
- **Live Users** panel: online users with active orders.
- **Driver Fleet**: connection status breakdown, stale locations, avg heartbeat age, recent disconnects.
- **Business Fleet**: online/offline, battery, heartbeat, subscription alive, by version/platform.
- **Order Pipeline**: by-status counts, stuck orders, avg assignment/delivery times.
- **Realtime Panel**: WebSocket connections, subscription counts, pubsub topic breakdown, recent events log.
- **Push Health**: delivery rates, open/action rates, by app type.
- Fullscreen toggle. Manual refresh.

### `/dashboard/market` — Market Product Management

**Key features:** Full category/subcategory/product CRUD with drag-and-drop reorder (`@dnd-kit`). Multi-column layout (categories | subcategories | products). Variant group management. Grid/list view toggle. Sort mode freezes filters and shows drag handles.

**Typing state:** Modal state (`category`, `subcategory`, `product`) and variant-group creation response are typed with explicit local interfaces; market-business selection uses inferred business query row types without callback casts.

**Hooks:** 17 custom hooks for data + mutation operations.

---

## 7. Pages — Admin Route Group (SUPER_ADMIN only)

### `/admin/banners` — Banner Management

**GraphQL:** 9 operations — `GET_BANNERS`, `CREATE_BANNER`, `UPDATE_BANNER`, `DELETE_BANNER`, `UPDATE_BANNER_ORDER`, `GET_BUSINESSES_LIST`, `GET_BUSINESS_PRODUCTS`, `GET_BUSINESS_PERFORMANCE_STATS`, `GET_PROMOTIONS`.

**Key features:**
- Media types: image, GIF, video.
- Display contexts (multiple).
- Linked entity: business / product / promotion.
- Date ranges (`startsAt`, `endsAt`).
- **Business Performance Leaderboard** embedded as a collapsible panel (revenue, order count, avg order value).
- Drag-to-reorder via native HTML5 drag API (not `@dnd-kit` — inconsistent).
- `// @ts-nocheck`.

### `/admin/messages` — Admin Messaging Center

**GraphQL:** 6 queries, 4 mutations, 2 subscriptions (driver + business channels).

**Key features:** Two-panel chat UI. Thread list (288px) + message view. New thread picker via search modal. `alertType` (INFO/WARNING/URGENT) styled badge. Read receipts for admin-sent messages. Date separators. Real-time via subscriptions. Thread list polls every 30s as fallback. De-duplicate message append.

### `/admin/financial/settlements` — Full Settlement Management

Uses: `SettlementsPage`, `GetSettlementSummary`, `GetDriverBalance`, `GetBusinessBalance`, `GetDriversWithBalance`, `GetBusinessesWithBalance`, `MarkSettlementAsPaid`. Settlement rules CRUD via `SettlementRules`, `CreateSettlementRule`, `UpdateSettlementRule`, `DeleteSettlementRule`.

### `/admin/promos` — Promotion List/Create/Edit

Light list page with filter (All/Active/Inactive). Create/edit in sub-routes. Delete with `window.confirm()` (no styled modal).

### `/admin/featured` — Featured Business Management

Uses `FeaturedBusinesses`, `AllBusinessesForFeatured`, `SetBusinessFeatured`.

---

## 8. Components

### `Sidebar`

Role-filtered navigation with 4 sections:
- **Operations:** Orders, Map, Drivers, Businesses, Users
- **Pricing & Promotions:** Delivery Zones, Delivery Pricing, Promotions, Notifications, Product Pricing, Inventory, Market
- **Finance & Admin:** Finances, Business Settlements, Banners, Featured, Admins, Messages, Audit Logs
- **Other:** Statistics, Ops Wall

Section/item visibility: `superAdminOnly`, `businessAdminVisible` flags computed per item and per section.

### `Topbar`

Operational controls (SUPER_ADMIN only): store open/close (with custom close message modal), banner toggle/edit, dispatch mode, Google Maps nav mode, inventory mode. Logout button visible to all roles.

**Issues:** Toggle handlers cast `bannerType as any ?? 'INFO'` — type safety hole.

### `GlobalPttOverlay`

Floating bottom-right indicator for PTT state: admin broadcasting (red), driver talking (cyan), error (red text). Only visible when PTT is active. Resolves driver name with `cache-first` query.

### `PermissionSelector`

Permission checkbox grid for `BUSINESS_EMPLOYEE`. 5 groups: Orders, Products, Financial, Settings, Analytics.

### `ProductsBlock` / `CategoriesBlock` / `SubcategoriesBlock`

Reusable CRUD blocks used in multiple pages (`businesses/page`, `businesses/[id]/page`, `products/page`, `categories/page`). Handle their own state, hooks, and drag-and-drop.

### `ScheduleEditor`

7-day weekly hours editor. `applyToAll()` copies Mon → all days.  
**Bug:** "Copy Mon → All" button label renders `â†'` (UTF-8 mojibake — `→` saved with wrong encoding).

### `InventoryCoverageModal`

Shows per-item fulfillment split (stock vs. market) for an order. Items categorized as stock-only, market-only, or mixed (mixed items appear in both sections by design).

### UI Primitives (`components/ui/`)

14 shadcn-ui components: `badge`, `Button`, `card`, `Checkbox`, `dialog`, `Dropdown`, `Input`, `label`, `Modal`, `Select`, `skeleton`, `switch`, `Table`, `tabs`, `textarea`.

---

## 9. Custom Hooks (`lib/hooks/`)

| Hook | Purpose |
|---|---|
| `useAdminPtt` | Agora RTC context — admin PTT send + driver PTT receive via subscription; shared hook state is typed at the GraphQL boundary |
| `useOrders` | Orders query + `ALL_ORDERS_SUBSCRIPTION`; new-order beep + toast; refetch cooldown; shared return shapes are typed from codegen |
| `useMapRealtimeData` | Drivers + orders + businesses for map; subscription-primary, 30s polling fallback; `mergeDriversByTimestamp()`; shared realtime state is typed from codegen |
| `useOrderRouteDistances` | Mapbox route calc per active order; recalc on >80m move or >60s elapsed |
| `usePrepTimeAlerts` | Fires `PrepTimeAlert` when `preparationMinutes` increases on a PREPARING order; 10-min TTL auto-dismiss; subscription payload is typed |
| `useBusinesses` / `useBusiness` | Business query + CRUD mutations; shared return/mutation payloads are typed from codegen |
| `useProducts` | Products + categories query for a business; flattened product list is normalized into a typed hook result |
| `useProductCategories` | Category CRUD hooks |
| `useProductSubcategories` | Subcategory CRUD hooks |

---

## 10. Key Libraries & Utilities

### `apollo-client.ts`

- HTTP + WS split link via `split()` on `operation.query`'s `operationKind`.
- Auth injection reads `localStorage` on every operation.
- Proactive JWT refresh using a chained forward observable — retries the original operation.
- InMemoryCache with no custom field policies.

### `auth-context.tsx`

- Persists to `localStorage` (`adminUser`, `authToken`, `refreshToken`).
- On mount, validates role before setting `isAuthenticated` — only `SUPER_ADMIN`, `ADMIN`, `BUSINESS_OWNER`, and `BUSINESS_EMPLOYEE` are allowed.

### `route-access.ts`

Pure function `canAccessAdminPanelPath(role, pathname)` — defines allowed paths per role. Centralized access control logic.

### `lib/audio/orderAlert.ts`

- Singleton state on `window.__adminOrderAlertState` — prevents duplicate `AudioContext` on React re-renders.
- 1500ms cooldown between alerts.
- `AudioContext` first, `HTMLAudioElement` fallback.
- Unlock listener on `click`/`keydown`/`touchend` for browser autoplay policy.

### `lib/avatarUtils.ts`

- `getAvatarColor(id)` — deterministic color from char-code hash, maps to 6 Tailwind classes.
- Fully wrapped in try/catch — returns `null` on failure so map markers render safely.

### Push-to-Talk (`useAdminPtt`)

- Agora SDK loaded lazily (`import("agora-rtc-sdk-ng")`) to prevent SSR crash.
- `startTalking(driverIds)` → fetch credentials → create RTC client in `live/host` mode → mic track → join channel → send `STARTED` PTT signal via `ADMIN_SEND_PTT_SIGNAL` mutation.
- `stopTalking()` → unpublish + leave + `STOPPED` signal.
- Separate `driverRtcClientRef` receives incoming driver audio via `ADMIN_PTT_SIGNAL_SUBSCRIPTION`.

---

## 11. Known Issues & Technical Debt

| Severity | Location | Issue |
|---|---|---|
| HIGH | `map/page.tsx` | `// @ts-nocheck` — most complex page has zero type safety |
| HIGH | `businesses/page.tsx` | Auth token read directly from `localStorage` for REST upload |
| HIGH | `ops-wall/page.tsx` | Auth token read directly from `localStorage` for REST fetch |
| MEDIUM | `drivers/page.tsx` | `DRIVER_REGISTER_MUTATION` defined inline with `gql` — not in operations folder |
| MEDIUM | `promotions/page.tsx` | `ASSIGN_PROMOTION_TO_USERS` imported from `notifications` domain — semantic mismatch |
| MEDIUM | `business-settlements/page.tsx` | Client-side search/filter over up to 200 records — no server-side search |
| MEDIUM | `productpricing/page.tsx` | Inline `graphql()` operation definitions — inconsistent with rest of codebase |
| LOW | `statistics/page.tsx` | Entirely placeholder — all values hardcoded, `recharts` installed but unconnected |
| LOW | `admin/banners/page.tsx` | Native HTML5 drag API used; rest of app uses `@dnd-kit` — inconsistent |
| LOW | `admin/promos/page.tsx` | `window.confirm()` for delete — no styled confirmation modal |
| LOW | `app/login/page.tsx` | Does not redirect if user is already authenticated |
| LOW | `apollo-client.ts` | `RefreshToken` mutation inlined, not exported — not accessible for testing or reuse |
| LOW | `businesses/page.tsx` | `// @ts-nocheck` |

---

## 12. GraphQL Operation Index

### Orders (`graphql/operations/orders/`)
- **Queries:** `GetOrders`, `GetOrder`, `GetOrdersByStatus`, `GetCancelledOrders`
- **Mutations:** `UpdateOrderStatus`, `CancelOrder`, `StartPreparing`, `UpdatePreparationTime`, `AssignDriverToOrder`, `AdminCancelOrder`, `SetOrderAdminNote`, `ApproveOrder`, `CreateTestOrder`
- **Subscriptions:** `OrdersUpdated`

### Businesses (`graphql/operations/businesses/`)
- **Queries:** `Business`, `Businesses`, `FeaturedBusinesses`, `AllBusinessesForFeatured`
- **Mutations:** `CreateBusiness`, `CreateBusinessWithOwner`, `UpdateBusiness`, `DeleteBusiness`, `SetBusinessSchedule`, `SetBusinessFeatured`

### Users (`graphql/operations/users/`)
- **Queries:** `Users`, `Drivers`, `UserBehavior`
- **Mutations:** `CreateUser`, `UpdateUser`, `DeleteUser`, `AdminUpdateDriverSettings`, `UpdateUserNote`, `AdminUpdateDriverLocation`, `AdminSetShiftDrivers`, `UpdateDriverOnlineStatus`, `SetUserPermissions`, `AdminSimulateDriverHeartbeat`
- **PTT:** `GetAgoraRtcCredentials` (Q), `AdminSendPttSignal` (M), `AdminPttSignal` (S)
- **Subscriptions:** `DriversUpdated`

### Store (`graphql/operations/store.ts`)
- **Queries:** `GetStoreStatus`
- **Mutations:** `UpdateStoreStatus`

### Notifications (`graphql/operations/notifications.ts`)
- **Queries:** `GetNotificationCampaigns`, `GetNotificationCampaign`, `PreviewCampaignAudience`
- **Mutations:** `CreateCampaign`, `SendCampaign`, `SendPushNotification`, `DeleteCampaign`, `AssignPromotionToUsers`

### Delivery Pricing (`graphql/operations/deliveryPricing.ts`)
- **Queries:** `GetDeliveryPricingTiers`
- **Mutations:** `SetDeliveryPricingTiers`, `CreateDeliveryPricingTier`, `UpdateDeliveryPricingTier`, `DeleteDeliveryPricingTier`

### Delivery Zones (`graphql/operations/deliveryZones.ts`)
- **Queries:** `GetDeliveryZones`
- **Mutations:** `CreateDeliveryZone`, `UpdateDeliveryZone`, `DeleteDeliveryZone`

### Settlements (`graphql/operations/settlements/`)
- **queries.ts:** `SettlementsPage`, `GetSettlementSummary`, `GetDriverBalance`, `GetBusinessBalance`, `GetDriversWithBalance`, `GetBusinessesWithBalance`, `MarkSettlementAsPaid` (mutation listed here)
- **settlementRules.ts:** `SettlementRules`, `SettlementRulesCount`, `BusinessesSelection`, `PromotionsSelection`, `CreateSettlementRule`, `UpdateSettlementRule`, `DeleteSettlementRule`

### Promotions (`graphql/operations/promotions/`)
- **Queries:** `GetPromotions`, `GetRecoveryPromotions`, `GetPromotionsAnalytics`
- **Mutations:** `CreatePromotion`, `UpdatePromotion`, `DeletePromotion`, `GrantFreeDelivery`, `IssueRecoveryPromotion`

`GetPromotionsAnalytics` returns a summary block, per-promotion rows, and a date-bucketed `dailyPoints` series used by the trends charts.

### Banners (`graphql/operations/banners/`)
- **Queries:** `GetBanners`, `Banner`, `GetActiveBanners`, `GetBusinessesList`, `GetBusinessPerformanceStats`, `GetBusinessProducts`
- **Mutations:** `CreateBanner`, `UpdateBanner`, `DeleteBanner`, `UpdateBannerOrder`

### Products (`graphql/operations/products/`)
- **Queries:** `ProductsAndCategories`, `ProductWithOptions`, `CatalogProducts`
- **Mutations:** `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `UpdateProductsOrder`, `CreateProductVariantGroup`, `DeleteProductVariantGroup`, `CreateOptionGroup`, `DeleteOptionGroup`, `UpdateOptionGroup`, `CreateOption`, `UpdateOption`, `DeleteOption`, `AdoptCatalogProduct`, `UnadoptCatalogProduct`

### Product Categories (`graphql/operations/productCategories/`)
- **Queries:** `ProductCategories`
- **Mutations:** `CreateProductCategory`, `UpdateProductCategory`, `UpdateProductCategoriesOrder`, `DeleteProductCategory`

### Product Subcategories (`graphql/operations/productSubcategories/`)
- **Queries:** `ProductSubcategoriesByBusiness`
- **Mutations:** `CreateProductSubcategory`, `UpdateProductSubcategory`, `DeleteProductSubcategory`

### Audit Logs (`graphql/operations/auditLogs/`)
- **Queries:** `GetAuditLogs`, `GetAuditLog`

### Inventory (`graphql/operations/inventory/`)
- **Queries:** `MyInventory`, `InventorySummary`, `OrderCoverage`, `InventoryEarnings`
- **Mutations:** `SetInventoryQuantity`, `BulkSetInventory`, `DeductOrderStock`, `RemoveInventoryItem`

### Business Messages (`graphql/operations/businessMessages/`)
- **Queries:** `BusinessMessageThreads`, `BusinessMessages`
- **Mutations:** `SendBusinessMessage`, `MarkBusinessMessagesRead`
- **Subscriptions:** `AdminBusinessMessageReceived`

### Driver Messages (`graphql/operations/driverMessages/`)
- **Queries:** `DriverMessageThreads`, `DriverMessages`
- **Mutations:** `SendDriverMessage`, `MarkDriverMessagesRead`
- **Subscriptions:** `AdminMessageReceived`

### Auth (`graphql/operations/auth/`)
- **Mutations:** `Login`

---

## 13. Dependencies on Other MDS Docs

| Doc | Relation |
|---|---|
| A1 (API) | All 138 ops are API-defined; JWT auth flow, refresh token endpoint |
| M9 (`MOBILE_ADMIN_DEEP_DIVE.md`) | Mobile-admin is the React Native counterpart; shares PTT, map, order, messaging features |
| M6 (`MOBILE_ADMIN_PANEL_PARITY_TRACKER.md`) | Which admin-panel features have/missing/planned mobile-admin equivalents |
| UI1 (`ADMIN_MOBILEBUSINESS_UI_CONTEXT.md`) | Product variant groups, option groups, business user UX |
| UI2 (`ADMIN_PANEL_BUSINESS_SETTLEMENTS.md`) | Settlement semantics, direction, payment methods |
| BL1..BL5 | Business logic docs for order flow, promotions, settlement rules, etc. |
| O21 (`OPTIMIZATION_TRACKER.md`) | Per-issue optimization recommendations for this app |

---

## 14. Quick Reference — Common Operations by Feature

| Task | Operation(s) |
|---|---|
| Load all active orders | `GetOrders` |
| Assign driver to order | `AssignDriverToOrder` |
| Cancel order with reason | `AdminCancelOrder` |
| Approve held order | `ApproveOrder` |
| Update prep time | `UpdatePreparationTime` |
| Grant free delivery | `GrantFreeDelivery` |
| Load live map data | `useMapRealtimeData` → `Drivers` query + `DriversUpdated` sub + order queries |
| Send driver/business message | `SendDriverMessage` / `SendBusinessMessage` |
| Manage store status | `GetStoreStatus` / `UpdateStoreStatus` |
| Create push campaign | `CreateCampaign` → preview `PreviewCampaignAudience` → `SendCampaign` |
| Manage delivery zones | `GetDeliveryZones` / `CreateDeliveryZone` / `UpdateDeliveryZone` / `DeleteDeliveryZone` |
| Set delivery pricing | `SetDeliveryPricingTiers` (replaces all) |
| Mark settlement paid | `MarkSettlementAsPaid` |
| Manage banners | `GetBanners` / `CreateBanner` / `UpdateBanner` / `UpdateBannerOrder` |
| Check ops health | `fetch('/health/ops-wall')` — REST, not GraphQL |
| Start PTT broadcast | `useAdminPtt.startTalking(driverIds)` → Agora + `AdminSendPttSignal` |
