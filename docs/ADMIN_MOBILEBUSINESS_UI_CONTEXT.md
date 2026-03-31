# Admin + Mobile-Business UI Context

<!-- MDS:UI1 | Domain: UI | Updated: 2026-03-19 -->
<!-- Depends-On: BL2 -->
<!-- Depended-By: M5 -->
<!-- Nav: Product type/variant changes → update BL2 (Product Refactor), M5 (Input Flow). Admin panel mutations → review B1 (API). -->

This document is a fast context handoff for future UI changes across `admin-panel` and `mobile-business`.

## Recent Updates

- 2026-03-19: Admin orders earnings calculation now derives business commission from active business settlement rules (same finance-rule source) instead of only business profile percentage, so `+earnings` matches configured `Settlement Rules` behavior.
- 2026-03-19: Refined admin orders earnings indicator behavior: delivery commission is now conditionally included only after driver assignment/out-for-delivery, marked with `DEL+`, and earnings tooltip now overlays above rows to avoid table layout/scroll expansion.
- 2026-03-19: Admin orders page (`/dashboard/orders`) refactored from dual layout (card view for business users, table view for super admin) to a unified card grid for all roles. Cards show status-colored border, customer + business + driver info, items preview, driver notes, prep time controls. Super admin cards additionally show driver assignment dropdown, status dropdown, and platform earnings with hover breakdown. Completed orders also use card grid with dimmed opacity, and super admin gets status dropdown on those too. Removed `Table`/`Th`/`Td` and `TimeDisplay` component (no longer used).
- 2026-03-19: Added admin orders earnings indicator in `admin-panel/src/app/dashboard/orders/page.tsx` for non-business admin views: each order now shows `+earnings` with breakdown (delivery commission, restaurant commission, markup) in table rows and order details modal.
- 2026-03-19: Restyled admin financial settlements tables (`/admin/financial/settlements`) to match business settlements table language (dark grid, compact header, status/direction chips, row hover, and action button styling) for cross-surface consistency.
- 2026-03-19: Added mobile parity tracker `docs/MOBILE/ADMIN_PANEL_MOBILE_REFACTOR_TRACKER.md` to keep business/admin mobile refactor aligned with admin-panel changes as a living backlog.
- 2026-03-19: `admin-panel` business settlements (`/dashboard/business-settlements`) UI/UX refactor: clearer filter layout, added `This week` and `From last settlement` date modes, improved active-range labeling, and explicit modal error messaging for order-details fetch failures.
- 2026-03-19: Fixed order-details authorization edge case for business users by allowing access when a matching business settlement exists for the order (fallback in `api/src/models/Order/resolvers/Query/order.ts`).
- 2026-03-19: Removed duplicate super-admin finance sidebar entries and kept a single `Financial Ops` link to `/admin/financial` for clearer separation from business settlements navigation.
- 2026-03-19: Separated business settlements into dedicated admin-panel route `/dashboard/business-settlements`; legacy `/dashboard/finances` now redirects by role (business -> dedicated page, non-business -> `/admin/financial/settlements`).
- 2026-03-19: `admin-panel` business settlements view (`/dashboard/finances`) was simplified to a flat table (removed grouped business dropdown accordion), retained filters, and switched order details to lazy fetch via per-row "View order" action.
- 2026-03-19: Corrected business settlements math in `admin-panel/src/app/dashboard/finances/page.tsx` to respect settlement direction semantics (`RECEIVABLE` means platform commission receivable from business; `PAYABLE` means payout owed to business), fixing reversed commission/net display.
- 2026-03-19: Added business-facing settlements in `admin-panel` (`/dashboard/finances`) with order id/time, itemized breakdown, commission/net reasoning, and filters (date/status/direction/search); added business sidebar entry and server-side settlement query scoping/permission checks for business roles.
- 2026-03-19: Replaced per-item category reorder updates with bulk `updateProductCategoriesOrder` mutation (API GraphQL/service/repository/resolver + admin hook/operation) so drag-save is a single request.
- 2026-03-19: Category sorting persistence moved from localStorage to backend `sortOrder` updates (`api` schema/service/repository + `admin-panel` category mutations/queries + drag-save in `CategoriesBlock`).
- 2026-03-19: Switched `admin-panel/src/components/businesses/ProductsBlock.tsx` sorting to market-style drag-and-drop with `dnd-kit` handles per category section; fixed invalid icon imports causing compile failures.
- 2026-03-19: Added drag-and-drop category sorting to `admin-panel/src/components/businesses/CategoriesBlock.tsx` with per-business persisted order in localStorage.
- 2026-03-19: Added business-facing product sorting controls in `admin-panel/src/components/businesses/ProductsBlock.tsx` (`Sort Items` mode with per-category up/down reordering persisted via `updateProductsOrder`).
- 2026-03-19: Suppressed noisy empty WebSocket error logs (`{}`) in `admin-panel/src/lib/graphql/apollo-client.ts` by ignoring empty normalized WS error payloads during reconnect cycles.
- 2026-03-19: In `admin-panel/src/components/businesses/ProductsBlock.tsx`, `Questions / Options` action is now shown only for deal/offer products; delete actions for questions/answers now use an explicit confirmation modal.
- 2026-03-19: Deal creation/editing in product forms is now admin-only in UI (`SUPER_ADMIN`/`ADMIN`); business roles no longer see deal toggles.
- 2026-03-19: Business-role dashboard landing now redirects to statistics via `admin-panel/src/app/dashboard/page.tsx`.
- 2026-03-19: Topbar controls for store live/close and global banner are now super-admin-only in UI and API (`admin-panel/src/components/dashboard/topbar.tsx`, `api/src/models/General/resolvers/Mutation/updateStoreStatus.ts`).
- 2026-03-18: Fixed admin settlements table rendering condition in `admin-panel/src/app/admin/financial/settlements/page.tsx` where selected-business view could show footer counts ("Showing x of x") but render no rows due nested ternary boolean output.
- 2026-03-18: Reorganized `admin-panel` sidebar navigation sections/order in `admin-panel/src/components/dashboard/sidebar.tsx` with requested grouping: Operations first, Pricing & Promotions second, Finance & Admin third, and remaining links under Other.

## Scope

- Admin product management UX
- Product creation/edit/delete for regular products, offers (deals), and variants
- GraphQL contracts and hooks that drive these flows
- Safe change checklist to keep codegen and UI stable

## Key Files

### Admin Panel

- `admin-panel/src/app/dashboard/productpricing/page.tsx`
  - Business-scoped product markup/night pricing editor
  - Shows base price, markup price, night price, and delta display
  - Row highlighting for missing markup/night values
  - Note: UTF-8 text rendering matters for currency/time labels (avoid mojibake such as `â‚¬`, `â€¦`)

- `admin-panel/src/app/dashboard/market/page.tsx`
  - Rich market management page (categories, subcategories, products, sorting)
  - Product create/edit modal supports:
    - `isOffer` (deal/offer)
    - `variantGroupId` (variant membership)
  - Delete modal supports:
    - delete single product
    - delete full variant group (optional checkbox when product belongs to a variant group)

- `admin-panel/src/components/businesses/ProductsBlock.tsx`
  - Reusable products management block used outside market page
  - Mirrors create/edit/delete behavior for product/offer/variant
  - Includes variant-group select/create in create and edit flows

- `admin-panel/src/components/dashboard/topbar.tsx`
  - Super-admin controls include store live/close, global banner, and dispatch toggle
  - Assignment mode context is shown inline as: `Order mode Currently: Dispatch mode|Self-assign mode`
  - This label reflects `dispatchModeEnabled` from `getStoreStatus` so the active order-assignment flow is always explicit

- `admin-panel/src/lib/hooks/useProducts.ts`
  - Core product hooks and data flattening from `ProductCard -> Product`
  - Includes hooks for:
    - `useCreateProductVariantGroup`
    - `useDeleteProductVariantGroup`

- `admin-panel/src/graphql/operations/products/queries.ts`
  - Product query includes nested product and variant metadata:
    - `isOffer`
    - `variantGroupId`
    - `variantGroup { id name }`

- `admin-panel/src/graphql/operations/products/mutations.ts`
  - Product and variant-group mutations:
    - `CREATE_PRODUCT`
    - `UPDATE_PRODUCT`
    - `DELETE_PRODUCT`
    - `CREATE_PRODUCT_VARIANT_GROUP`
    - `DELETE_PRODUCT_VARIANT_GROUP`

### Mobile Business

- `mobile-business/graphql/products.ts`
  - Uses `products(...)` as `ProductCard` shape; reads rich fields from nested `product`

- `mobile-business/app/(tabs)/products.tsx`
  - Flattens card payload to the local `Product` shape

- `mobile-business/app/(tabs)/dashboard.tsx`
  - Reads product availability from flattened/nested product data

## Current Product Type Behavior

- Regular Product:
  - `isOffer = false`
  - `variantGroupId = null`

- Offer / Deal Product:
  - `isOffer = true`
  - `variantGroupId = null`

- Variant Product:
  - `isOffer = false`
  - `variantGroupId = <group id>`

- UI mutual exclusivity:
  - Selecting offer clears variant group
  - Selecting variant clears offer flag

## Delete Rules

- Category delete: cascades to subcategories/products (warning shown)
- Subcategory delete: cascades to products (warning shown)
- Product delete:
  - default deletes only selected product
  - if product has `variantGroupId`, user can choose to delete entire variant group
  - offer products display explicit deal/offer warning

## GraphQL Contract Notes

- `OrderItem` uses `unitPrice` (not `price`)
- `products(businessId)` returns `ProductCard`
  - do not assume flat product fields at top level
  - read product details from `ProductCard.product`

## Order Card Contact Visibility (Current State)

- Admin panel orders page (`/dashboard/orders`) active order cards display customer name and customer phone when available.
- Admin panel map page (`/dashboard/map`) left sidebar order cards display customer name and customer phone when available.
- Mobile-business orders tab (`app/(tabs)/index.tsx`) order cards display customer name and customer phone when available in a dedicated customer block.

## Map Status Transition (Current State)

- Admin panel map page (`/dashboard/map`) status changes use a confirmation modal before mutation.
- Changing an order to `PREPARING` requires entering `Preparation time (minutes)` in that confirmation modal.
- The map page uses `startPreparing(id, preparationMinutes)` for `PREPARING` transitions, and keeps `updateOrderStatus` for the other status transitions.
- On the map page, `PREPARING` status visual styling uses purple tokens (cards, status chips, and related status accents).

## Map Realtime Data Documents (Current State)

- Admin panel map realtime hook (`admin-panel/src/lib/hooks/useMapRealtimeData.ts`) reads GraphQL documents directly from generated `src/gql/graphql` exports.
- The hook currently uses generated document constants for businesses, drivers, orders, and both map subscriptions to keep Apollo document references stable at runtime.

## Admin Margin Badges (Current State)

- Admin panel map and orders surfaces compute margin badges from net settlement flow: `receivable - payable`, then include markup revenue from item snapshots.
- Settlement inputs include both `BUSINESS` and `DRIVER` rule entities, with direction-aware handling (`RECEIVABLE` adds to platform inflow, `PAYABLE` adds to platform outflow).
- Percent-rule bases use order subtotal for order-price rules and delivery base for delivery-fee rules, while promos are reflected through already-discounted order totals.
- Margin badges are severity-coded by net result: healthy (green), thin (amber), negative (red).
- Margin breakdown surfaces now explicitly show component contributions as restaurant commission, markup, and driver commission (driver can be positive or negative depending on settlement rule direction).
- Driver component labels are sign-aware in margin breakdowns: positive values are shown as `Driver commission`, while negative values are shown as `Driver payout`.

## Customer Phone Visibility (Current State)

- Admin panel orders page cards show customer phone when available.
- Admin panel orders details modal shows customer phone when available.
- Admin panel approval confirmation modals (orders and map surfaces) show customer phone when available, with click-to-call links.

## New Order Audible Alert (Current State)

- Admin panel plays a new-order sound from `/sounds/beep.wav` (served from `admin-panel/public/sounds/beep.wav`).
- If the MP3 file is missing or blocked, admin panel falls back to a synthesized multi-tone beep.
- The alert is ID-based (new order IDs only), so status updates on existing orders do not trigger beeps.
- The alert has a cooldown to avoid repetitive beeps during burst updates.
- Realtime order subscription handlers sanitize incoming payload entries before cache merges; malformed/empty entries are ignored and fall back to throttled refetch.
- Audio context is unlocked on first user interaction (`pointerdown`/`keydown`/`touchstart`), after which new-order beeps play normally.

## Trusted Customer + Order Count (Current State)

- Admin panel orders and map flows expose customer lifetime order count directly in operational surfaces.
- Orders page shows customer total orders on active order cards, in order details, and in approval modal context.
- Map page shows customer total orders in the right-side order detail panel and approval modal context.
- Admins can toggle a trusted-customer marker from both orders and map approval contexts.
- Trusted marker uses user metadata (`[TRUSTED_CUSTOMER]` marker and green flag color) so no new customer-table column is required.
- Backend order creation keeps risk-triggered approval flow active for all users (first/high-value/out-of-zone), including trusted customers.
- Trusted state is shown as context in approval modals so admins can decide whether to call.
- Orders and map pages support per-user modal suppression (`Don't auto-open approval modal again for this user`) persisted in backend user metadata (`[SUPPRESS_APPROVAL_MODAL]` marker in `adminNote`), so the setting is consistent across pages/admin sessions/devices.
- `locationFlagged` remains computed and available for map/ops visibility.
- Admin orders/map approval badges use derived approval reasons with payload fallback logic, so first/high-value flags are still visible in UI even when subscription/query payloads are sparse.

## Mobile Customer Awaiting Approval Modal (Current State)

- Mobile customer active-order floating bar treats `AWAITING_APPROVAL` as a first-class active status with dedicated banner label and status message.
- Checkout flow registers an auto-open intent when the created order status is `AWAITING_APPROVAL`.
- The floating-bar layer opens a large centered review modal that takes most of the viewport once that awaiting order is present in active-order state.
- The modal is dismissible and shows reason-specific, high-contrast numbered cards from order `approvalReasons` when provided (including multiple reasons at once, such as first order and out-of-zone together).
- If `approvalReasons` is missing in the current payload, the modal falls back to the generic three-bullet explanation (first order, high-value, out-of-zone) so UI behavior remains stable.
- Modal copy includes a note that an agent may call for confirmation.
- While an order remains `AWAITING_APPROVAL`, tapping the active-order banner reopens this modal instead of navigating into order details.
- Delivered/cancelled transitions remove the active floating bar without hook-order instability, so moving out of active state does not trigger a transient global error boundary.

## Mobile Customer Out-of-Zone Prompt Timing (Current State)

- Home out-of-zone prompt evaluation is session-scoped for the running app process (module-level gate), not component-mount scoped.
- If the user has had an active order during the current app session, the out-of-zone prompt stays suppressed for the rest of that session.
- The out-of-zone prompt can appear again only after full app re-init (fresh JS runtime), matching "show once per app init" behavior.

## Admin Delivery Zones Editor (Current State)

- Admin panel delivery-zones page supports creating multiple delivery zones; there is no single-zone cap in backend storage or mutation contracts.
- Multiple zones can be marked as `isServiceZone=true` at the same time, and service-coverage checks evaluate the full active service-zone set.
- Save flow resolves polygon points from either form state or current Mapbox Draw layer state, so repeated create/edit cycles keep polygon validation stable even when draw events are missed.

## Orders Page Completed Section (Current State)

- Admin panel orders page (`/dashboard/orders`) shows completed orders in a table view (not cards).
- Completed table supports quick status filtering with `All`, `Delivered`, and `Cancelled` filter controls.
- Completed rows include order id/time, customer (including phone when present), business, status, total, and details action.

## Dev Workflow (Safe)

1. Update GraphQL documents first (`admin-panel/src/graphql/operations/...`)
2. Run codegen:
   - `cd admin-panel && npm run codegen`
3. Fix TS errors in hooks/UI consumers
4. Re-run codegen if documents changed again
5. Validate delete flows manually:
   - delete regular product
   - delete offer
   - delete variant only
   - delete whole variant group

## Common Pitfalls

- Forgetting to map nested `ProductCard.product` fields in hooks
- Setting both `isOffer` and `variantGroupId` simultaneously
- Querying stale fields after schema updates
- Updating UI types but not mutation payloads (or vice versa)
- Saving files with the wrong encoding, which can corrupt UI symbols (currency sign, ellipsis, dash)

## Quick Extension Ideas

- Add table badges for `Offer` and `Variant`
- Add guardrails to block deleting the last variant in a group without confirmation
- Add analytics events for create/edit/delete by product type
