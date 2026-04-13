# Web Customer App — Deep Dive (W2)

**MDS ID:** W2  
**Last updated:** 2026-04-13  
**Path:** `web-customer/`  
**Relates to:** M12 (mobile-customer), W1 (admin panel), A1, B1, B2, B5, B6, BL1, BL3

---

## 1. Overview

The web-customer app is the **browser-based customer ordering platform** — the web counterpart to `mobile-customer` (M12). Built with Next.js 16 / React 19, it provides the full customer ordering experience:

- Browse businesses and the market
- Configure products with variants and options
- cart management with multi-item support
- Checkout with Mapbox address picker and delivery-fee calculation
- Live order tracking with animated driver map
- Saved addresses, profile management, language and theme toggle
- Promotional code validation and auto-suggested discounts
- Push-to-web not implemented (no FCM equivalent)

---

## 2. Technology Stack

| Category | Library / Version |
|---|---|
| Framework | Next.js 16.2.3, React 19.2.4 |
| GraphQL | Apollo Client 4.1.7 + `graphql-ws` 6.0.8 |
| Codegen | `@graphql-codegen` (configured, operations in `graphql/operations/`) |
| Maps | `mapbox-gl` 3.21.0 + `react-map-gl` 8.1.1 |
| State | Zustand 5.0.12 (6 stores) |
| i18n | Custom context-based (`I18nProvider`) — `en` + `al` (sq) |
| UI | Tailwind CSS, `lucide-react`, 4 shadcn-ui-style components |
| Validation | `zod` 4.3.6 (installed, limited use) |
| Date utils | `date-fns` 4.1.0 |
| Geometry | Custom `pointInPolygon.ts` (ray-casting) |
| Build | Turbopack, `null-loader` for SSR map suppression |

**Extra / dead weight:**
- `maplibre-gl` is installed but unused — only `mapbox-gl` / `react-map-gl/mapbox` is used.

---

## 3. Project Structure

```
web-customer/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root HTML shell + dark-mode FOWT script
│   │   ├── page.tsx                 # Root redirect shim → (main)/page
│   │   ├── providers.tsx            # Apollo, auth, i18n, all global overlays
│   │   ├── globals.css
│   │   ├── login/page.tsx           # Email + password login
│   │   ├── signup/page.tsx          # 5-step signup wizard
│   │   ├── forgot-password/page.tsx # Request password-reset email
│   │   ├── reset-password/page.tsx  # Consume reset token from URL
│   │   └── (main)/                  # Authenticated route group
│   │       ├── layout.tsx           # Shell (Header, main, Footer)
│   │       ├── page.tsx             # Home: banners + featured + business grid
│   │       ├── business/[businessId]/page.tsx  # Business detail + product browser
│   │       ├── orders/page.tsx      # Re-exports profile/page.tsx (no dedicated orders list)
│   │       ├── orders/[orderId]/page.tsx        # Order detail + live map
│   │       ├── addresses/page.tsx   # Saved address CRUD
│   │       ├── profile/page.tsx     # Profile hub (settings, links, logout)
│   │       ├── market/page.tsx      # Market grocery browser (2-level category nav)
│   │       ├── product/[productId]/page.tsx     # Full product detail + add to cart
│   │       ├── checkout/page.tsx    # Route shell → CheckoutFlow
│   │       └── cart/page.tsx        # redirect("/") — cart is a drawer, not a page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           # Sticky top + mobile bottom tab bar
│   │   │   ├── Footer.tsx           # Static links footer
│   │   │   ├── ActiveOrderBanner.tsx # Live active-order pill + delivered detect
│   │   │   ├── CartFloatingBar.tsx  # Sticky CTA bar when cart has items
│   │   │   └── StoreStatus.tsx      # StoreStatusInit (headless) + StoreClosedOverlay
│   │   ├── home/
│   │   │   ├── BannerCarousel.tsx   # Auto-play banner carousel
│   │   │   └── CategoryGrid.tsx     # Hardcoded horizontal category shortcut row
│   │   ├── business/
│   │   │   ├── BusinessCard.tsx     # Business thumbnail card + favorite toggle
│   │   │   └── ProductOptionsModal.tsx  # Bottom-sheet product configurator
│   │   ├── checkout/
│   │   │   ├── CartDrawer.tsx       # Modal wrapper → CheckoutFlow
│   │   │   ├── CheckoutFlow.tsx     # 3-step checkout (cart → address → confirm)
│   │   │   └── AddressPickerMap.tsx # Mapbox pin drop + geocoding + zone overlay
│   │   ├── orders/
│   │   │   ├── ActiveOrderModal.tsx     # Full-screen tracking modal (map + stepper)
│   │   │   ├── AwaitingApprovalModal.tsx # Order held for approval
│   │   │   ├── OrderSuccessModal.tsx    # Post-checkout / post-delivery success
│   │   │   └── OrderTrackingMap.tsx     # Mapbox animated driver tracking map
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Skeleton.tsx
│   ├── graphql/
│   │   └── operations/
│   │       ├── addresses.ts         # 5 ops (1q + 4m)
│   │       ├── auth/                # Login, signup, password reset mutations
│   │       ├── banners.ts           # GetActiveBanners
│   │       ├── businesses/          # GetBusinesses, GetBusiness, GetBusinessMinimum, FeaturedBusinesses
│   │       ├── deliveryPricing.ts   # CalculateDeliveryPrice
│   │       ├── orders/              # Queries + mutations + subscriptions
│   │       ├── products/            # GetProduct, GetProducts, GetProductCategories, GetProductSubcategories
│   │       ├── promotions.ts        # ValidatePromotions, GetApplicablePromotions
│   │       ├── serviceZone.ts       # GetServiceZones
│   │       └── store.ts             # GetStoreStatus + StoreStatusUpdated subscription
│   ├── hooks/
│   │   └── useHydratedBusinesses.ts  # N+1 business detail hydration hook
│   ├── lib/
│   │   ├── graphql/apollo-client.ts  # HTTP+WS split, JWT refresh, onError retry
│   │   ├── auth-context.tsx          # Auth state, login, logout, loginWithToken
│   │   ├── location-context.tsx      # Browser geolocation (disabled/vestigial)
│   │   ├── utils.ts                  # cn(), formatPrice(), formatDate()
│   │   └── pointInPolygon.ts         # Ray-casting zone containment check
│   ├── localization/
│   │   └── index.tsx                 # I18nProvider + useTranslations hook (en/al)
│   └── store/
│       ├── cartStore.ts              # Cart items (persisted localStorage)
│       ├── cartDrawerStore.ts        # Cart drawer open/close (ephemeral)
│       ├── favoritesStore.ts         # Favorite business IDs (persisted localStorage)
│       ├── orderModalsStore.ts       # Success + awaiting-approval modal state
│       ├── searchStore.ts            # Global search query (ephemeral)
│       └── storeStatusStore.ts       # Platform open/closed status
```

---

## 4. Authentication

### Flow

1. Login form (`/login`) or signup wizard (`/signup`) → mutations → JWT + refresh token stored in `localStorage` (`authToken`, `refreshToken`, `userData`).
2. `AuthProvider` (`auth-context.tsx`) reads `localStorage` on mount and hydrates React state — no server-side validation on load.
3. Apollo Client injects JWT via `setContext` on every request; checks expiry 60s ahead and calls `refreshAccessToken` (raw `fetch` with `RefreshToken` mutation) proactively.
4. `onError` link retries on `UNAUTHENTICATED` response.

### Signup Steps

`/signup` is a 5-step wizard:
1. Account details (name, email, password)
2. Verify email (6-digit code)
3. Add phone number
4. Verify phone (6-digit code)
5. Complete (auto-redirect home after 2s)

Mutations: `InitiateSignup`, `VerifyEmail`, `SubmitPhoneNumber`, `VerifyPhone`, `ResendEmailVerification`.

### Issues

- `ME_QUERY` is imported in `auth-context.tsx` but **never called** — user is trusted from `localStorage` without server re-validation on reload.
- Apollo `clearStoredAuth` and `auth-context.tsx` `logout` are not synchronized — if Apollo clears storage due to token expiry, React state still shows the user as authenticated until an API failure surfaces.
- Subscription WebSocket does not inject updated tokens — uses the token from the initial connection only.
- `onError` retry loop has no limit — could loop indefinitely if server keeps returning `UNAUTHENTICATED`.

---

## 5. GraphQL & Apollo Configuration

### Apollo Client (`lib/graphql/apollo-client.ts`)

- Split link: HTTP for queries/mutations, WebSocket (`graphql-ws`) for subscriptions.
- Auth via `setContext` — reads `localStorage.getItem('authToken')` on each request.
- Proactive refresh: parses JWT expiry via manual `atob` decode; calls `refreshAccessToken` if within 60s of expiry.
- `onError` link: `UNAUTHENTICATED` → refresh + `forward(operation)` retry (no retry limit).
- `InMemoryCache` — no custom type policies or field merge config.

### Operation Totals (estimated)

| Type | Count |
|---|---|
| Queries | ~20 |
| Mutations | ~20 |
| Subscriptions | 3 |

### Subscriptions

| Name | Domain | Consumer |
|---|---|---|
| `UserOrdersUpdated` | orders | `ActiveOrderBanner` (60s poll + sub) |
| `OrderStatusUpdated` | orders | `ActiveOrderModal`, `orders/[orderId]/page` |
| `OrderDriverLiveTracking` | orders | `ActiveOrderModal`, `orders/[orderId]/page` |
| `StoreStatusUpdated` | store | `StoreStatus.tsx` |

---

## 6. Pages

### `/` and `/(main)/` — Home

Renders: banner carousel, category shortcut grid, featured businesses (up to 6), filterable full business grid.

- Banners: `GET_ACTIVE_BANNERS` (`displayContext: "HOME"`). Falls back to **3 hardcoded static banners** (including "Use code WELCOME20") if no real banners exist.
- Featured: `GET_FEATURED_BUSINESSES` (capped to 6).
- Businesses: `useHydratedBusinesses` (N+1 pattern — see §8).
- Client-side text filter on `name` + `description` using global `useSearchStore.query`.

### `/business/[businessId]` — Business Detail

IntersectionObserver-driven sticky category tab bar. Products grouped by category with jump navigation. `ProductOptionsModal` for products with options.

- `GET_BUSINESS` + `GET_PRODUCTS` + `GET_PRODUCT_CATEGORIES`.
- Shows "Closed" overlay if `business.isOpen === false`.
- Uses `use(params)` (React 19 async params).

### `/orders` — Order List

**No dedicated order list page.** `/orders` re-exports `profile/page.tsx`. Order history is embedded in the profile view.

### `/orders/[orderId]` — Order Detail

Status stepper, live Mapbox tracking map (SSR disabled), itemized receipt, cancel and review.

- `GET_ORDER` (`no-cache`) + `ORDER_STATUS_UPDATED` sub (triggers refetch) + `ORDER_DRIVER_LIVE_TRACKING` sub (active when `READY`/`OUT_FOR_DELIVERY`).
- Review form visible only when `DELIVERED && !reviewSent`.
- Missing `<Suspense>` boundary around `use(params)` — could throw unhandled suspension.

### `/profile` — Profile Hub

User info card, orders count badge, addresses link, language toggle (calls `SET_MY_PREFERRED_LANGUAGE_MUTATION`), theme toggle (direct DOM + localStorage), logout.

- `GET_ORDERS` with `limit: 50` fetched purely for a count label — overkill.
- `SET_MY_EMAIL_OPT_OUT_MUTATION` imported and wired but no visible toggle in UI.

### `/addresses` — Saved Addresses

List + add/edit/delete/set-default CRUD. `AddressPickerMap` (SSR disabled) for location selection. Delete guarded with native `confirm()`.

- All 4 mutations use `refetchQueries` instead of cache updates — 4 extra network round-trips.

### `/market` — Market Grocery Browser

Two-level category/subcategory filter tabs. Inline quantity stepper per product card.

- Finds the market business by `businessType === "MARKET"` from `GET_BUSINESSES`. Only supports a single market business.
- **Bug:** `updateQuantity(product.id, qty)` uses raw `productId` as cart item key, but `cartStore.addItem` generates `id = ${product.id}-${variantId}-${Date.now()}`. The `updateQuantity` lookup compares `i.id === id`, so it will never find the item — market product quantity changes silently fail.
- Global `useSearchStore.setQuery` affects home page search when navigating back.

### `/product/[productId]` — Product Detail

Variant selector, option groups, quantity picker, notes field, add to cart.

- `businessId` comes from `?businessId=` query param. If missing, `businessName` is `""` in the cart item.
- `canAdd` validates required fields before enabling the add button.

### `/checkout` — Checkout Shell

Thin wrapper around `<CheckoutFlow>` with `onClose = () => router.push("/")`.

### `/cart` — Cart Page

Immediately `redirect("/")` — cart is the `CartDrawer` overlay, not a page.

### `/login`, `/signup`, `/forgot-password`, `/reset-password`

Standard auth pages. Signup is a 5-step wizard. Reset-password reads token from URL query param.

---

## 7. Components

### `Header`

Sticky top bar with: logo, nav tabs (`/` + `/market`), profile/logout (desktop), locale/logout (mobile bottom tab).

**Issues:**
- Mobile bottom nav only has Restaurants + Market — Profile and Orders tabs are absent.
- Locale toggle doesn't call `SET_MY_PREFERRED_LANGUAGE_MUTATION` — UI language changes but isn't persisted to the server.
- Footer has hardcoded English strings (not translated).
- Footer links to `/restaurants` — that route doesn't exist (home is `/`).

### `ActiveOrderBanner`

60s polling + `USER_ORDERS_UPDATED` subscription. Pill banner shows first active order. Opens `ActiveOrderModal` or `AwaitingApprovalModal`.

**Bugs:**
- Delivered detection fires `showOrderDelivered` for **any order that disappears from the active list**, including cancelled orders → incorrect success modal on cancellation.

### `CartFloatingBar` + `ActiveOrderBanner` Overlap

Both use `z-40` + `bottom-*` positioning. When cart has items **and** there is an active order, they visually overlap with no coordination.

### `CheckoutFlow` — 3-Step Checkout

Step 1: cart review, coupon code, priority toggle.  
Step 2: address picker (saved addresses + map pin).  
Step 3: order summary + place order.

**Bugs/issues:**
- Multi-business cart minimum check only validates `businessIds[0]` — other businesses' minimums ignored.
- Delivery price defaults silently to `€2.00` while the lazy query loads or if it fails.
- `promoResult.effectiveDeliveryPrice` is stored but the displayed delivery fee ignores it — potential discount discrepancy.
- `AddressPickerMap` has no `loading` skeleton passed to `dynamic()`.

### `AddressPickerMap`

Full Mapbox map with center-pin reverse geocode, GPS locate, forward text search (Mapbox Geocoding API), delivery zone overlay (grey mask outside zone).

**Issues:**
- `isMapMoving` can get stuck `true` if the geocode is aborted before the debounce fires.
- Mapbox token exposed in client network calls (expected for public tokens).
- `NEXT_PUBLIC_MAPBOX_TOKEN` unset = silent blank map.

### `OrderTrackingMap`

Driver position animated at 900ms ease-out via `requestAnimationFrame`. Cinematic approach stages at 400m/150m/80m with camera pitch. `GJILAN_BOUNDS` hardcoded.

**Issues:**
- Dark map style (`dark-v11`) while `AddressPickerMap` uses streets style — inconsistent.

### `ProductOptionsModal`

Bottom-sheet configurator: variants, option groups (radio or multi-select up to `maxSelections`), quantity, add to cart.

- `basePrice` = `effectivePrice ?? markupPrice ?? price` from variant or product.
- Cart item `id` = `${productId}-${variantId}-${Date.now()}` — unique per action.

---

## 8. Stores (Zustand)

| Store | Key | Persistence | Purpose |
|---|---|---|---|
| `cartStore` | `cart-storage` | localStorage | Cart items, totals, deduplication |
| `cartDrawerStore` | — | Ephemeral | Cart drawer open/close |
| `favoritesStore` | `favorites-storage` | localStorage | Favorite business IDs (client-only) |
| `orderModalsStore` | — | Ephemeral | Success + awaiting modals |
| `searchStore` | — | Ephemeral | Global search query string |
| `storeStatusStore` | — | Ephemeral | Platform open/closed + banner +`wasOpenOnEntry` |

**Cart store issues:**
- Deduplication key uses `JSON.stringify(selectedOptions)` — order-dependent, could create duplicate entries for identical options added in different order.
- No cross-business enforcement in `addItem` — UI must call `clearBusinessItems` correctly; store doesn't validate.

**Favorites:** Client-only local storage — not synced to the backend. Cleared on `localStorage` clear.

---

## 9. Hooks & Lib

### `useHydratedBusinesses`

Fetches thin `GET_BUSINESSES` list then fires `GET_BUSINESS` for each ID via `Promise.allSettled`.

**Critical issue — N+1 pattern:** 20 businesses = 21 GraphQL requests. Replace with a single `businesses { ...fullFields }` query.

### `I18nProvider` / `useTranslations`

Dot-path translation key lookup with `{{param}}` / `{param}` interpolation (both formats mixed). Falls back to humanized key display. Locale persisted to `localStorage["preferred-locale"]`.

**Issue:** Interpolation template formats are inconsistent — some use `{{}}`, some `{}`.

### `auth-context.tsx`

React context; user hydrated from `localStorage` on mount (no server validation). `loginWithToken` for OAuth / signup handoff.

### `location-context.tsx`

Vestigial — geolocation auto-request is commented out. `AddressPickerMap` uses `navigator.geolocation` directly.

### `pointInPolygon.ts`

Ray-casting polygon test. Mirrors `mobile-customer` implementation.

---

## 10. Known Issues & Technical Debt

| Severity | Location | Issue |
|---|---|---|
| HIGH BUG | `market/page.tsx` | `updateQuantity(product.id, qty)` uses `productId` as key but cart items have `id = "${productId}-${variantId}-${Date.now()}"` — quantity stepper silently does nothing |
| HIGH BUG | `ActiveOrderBanner.tsx` | Cancelled orders trigger the "Order Delivered" success modal |
| HIGH | `useHydratedBusinesses.ts` | N+1 pattern: one `GET_BUSINESS` request per business on home page load |
| MEDIUM BUG | `CheckoutFlow.tsx` | Multi-business cart only validates minimum order amount for first business |
| MEDIUM BUG | `CheckoutFlow.tsx` | Delivery fee defaults silently to `€2.00` while loading or on query failure |
| MEDIUM BUG | `orders/[orderId]/page.tsx` | Missing `<Suspense>` wrapper around `use(params)` — can throw unhandled suspension |
| MEDIUM | `auth-context.tsx` | `ME_QUERY` never called — user data trusted from `localStorage` without server validation |
| MEDIUM | `apollo-client.ts` + `auth-context.tsx` | `clearStoredAuth` and `logout()` not synchronized — React state stays authenticated after Apollo clears tokens |
| MEDIUM | `apollo-client.ts` | `onError` retry has no limit — theoretically infinite loop if server keeps returning `UNAUTHENTICATED` |
| MEDIUM | `Header.tsx` | Mobile bottom nav missing Profile and Orders tabs |
| MEDIUM | `Header.tsx` | Locale toggle doesn't persist to backend (`SET_MY_PREFERRED_LANGUAGE_MUTATION` not called) |
| MEDIUM | `page.tsx` (root) | Duplicate layout shell with `(main)/layout.tsx` — Header/Footer changes need updating in two places |
| MEDIUM | `(main)/page.tsx` | 3 hardcoded fallback banners with real promo copy (`WELCOME20`, "Free delivery this weekend") visible to customers if no banners configured |
| MEDIUM | `providers.tsx` | `LocationProvider` commented out with no resolution plan — vestigial code |
| LOW | `CartFloatingBar` + `ActiveOrderBanner` | Both `z-40 bottom-*` — overlap when both visible simultaneously |
| LOW | `CheckoutFlow.tsx` | `promoResult.effectiveDeliveryPrice` stored but ignored in delivery fee display |
| LOW | `AddressPickerMap.tsx` | `isMapMoving` can stick `true` on aborted geocode |
| LOW | `OrderTrackingMap.tsx` | Dark map style (`dark-v11`) vs `AddressPickerMap` streets style — inconsistent |
| LOW | `cartStore.ts` | `JSON.stringify(selectedOptions)` deduplication key is order-dependent |
| LOW | `searchStore.ts` | Single global query: searching in market persists to home page filter and vice versa |
| LOW | `layout.tsx` | `lang="en"` hardcoded — never updated for `al` locale |
| LOW | `Footer.tsx` | Footer strings hardcoded English (not translated); `/restaurants` link may 404 |
| LOW | `signup/page.tsx` | All mutation responses typed `as any` — no codegen types used |
| LOW | `profile/page.tsx` | `GET_ORDERS` with `limit: 50` fetched just for a count label |
| LOW | `profile/page.tsx` | `SET_MY_EMAIL_OPT_OUT_MUTATION` wired but no UI toggle visible |
| LOW | `addresses/page.tsx` | All 4 mutations use `refetchQueries` — 4 extra network round-trips per action |
| LOW | `CategoryGrid.tsx` | Categories hardcoded — not data-driven from API |
| LOW | `businesses/[businessId]/page.tsx` | Product shape has dual format (`p?.product ?? p`) — fragile runtime normalization |
| LOW | `favoritesStore.ts` | Favorites client-only — not synced to server |

---

## 11. GraphQL Operation Index

### Auth (`graphql/operations/auth/`)
- **Mutations:** `Login`, `InitiateSignup`, `VerifyEmail`, `SubmitPhoneNumber`, `VerifyPhone`, `ResendEmailVerification`, `RequestPasswordReset`, `ResetPassword`

### Addresses (`graphql/operations/addresses.ts`)
- **Queries:** `GetMyAddresses`
- **Mutations:** `AddUserAddress`, `UpdateUserAddress`, `DeleteUserAddress`, `SetDefaultAddress`

### Banners (`graphql/operations/banners.ts`)
- **Queries:** `GetActiveBanners`

### Businesses (`graphql/operations/businesses/`)
- **Queries:** `GetBusinesses`, `GetBusiness`, `GetBusinessMinimum`, `GetFeaturedBusinesses`, `GetAllBusinessesForFeatured`

### Delivery Pricing (`graphql/operations/deliveryPricing.ts`)
- **Queries:** `CalculateDeliveryPrice`, `GetPrioritySurchargeAmount`

### Orders (`graphql/operations/orders/`)
- **Queries:** `GetOrder`, `GetOrders`, `GetOrdersByStatus`
- **Mutations:** `CreateOrder`, `CancelOrder`, `SubmitOrderReview`
- **Subscriptions:** `UserOrdersUpdated`, `OrderStatusUpdated`, `OrderDriverLiveTracking`

### Products (`graphql/operations/products/`)
- **Queries:** `GetProduct`, `GetProducts`, `GetProductCategories`, `GetProductSubcategoriesByBusiness`

### Promotions (`graphql/operations/promotions.ts`)
- **Queries:** `ValidatePromotions`, `GetApplicablePromotions`

### Service Zone (`graphql/operations/serviceZone.ts`)
- **Queries:** `GetServiceZones`

### Store (`graphql/operations/store.ts`)
- **Queries:** `GetStoreStatus`
- **Subscriptions:** `StoreStatusUpdated`

---

## 12. Quick Reference

| Task | Implementation |
|---|---|
| Load home page businesses | `useHydratedBusinesses` (N+1 — see §8) |
| Add product to cart | `cartStore.addItem` — from `ProductOptionsModal` or `market/page` |
| Open cart | `cartDrawerStore.open()` → `CartDrawer` → `CheckoutFlow` |
| Place order | `CheckoutFlow` → 3 steps → `CREATE_ORDER` mutation |
| Track live order | `ActiveOrderModal` + `OrderTrackingMap` + `ORDER_DRIVER_LIVE_TRACKING` sub |
| Check store open/closed | `StoreStatusInit` (headless) → `storeStatusStore` → `StoreClosedOverlay` |
| Language toggle | `useTranslations().setLocale()` + `SET_MY_PREFERRED_LANGUAGE_MUTATION` (locale saved to localStorage only — mutation not wired in Header) |
| Favorites | `favoritesStore` — client-only, localStorage |

---

## 13. Dependencies on Other MDS Docs

| Doc | Relation |
|---|---|
| M12 (`CUSTOMER_APP.md`) | Mobile-customer is the RN counterpart; shares the same API, same checkout flow, same order tracking logic |
| A1 (`ARCHITECTURE.md`) | Shared API, JWT auth flow |
| B2 (`ORDER_CREATION.md`) | `CREATE_ORDER` flow — preflight gate, AWAITING_APPROVAL, locationFlagged |
| B5 (`AUTH_AND_USERS.md`) | JWT model, signup steps, token rotation |
| B6 (`DELIVERY_AND_PRODUCT_PRICING.md`) | `CALCULATE_DELIVERY_PRICE`, service zones, haversine |
| BL1 (`SETTLEMENTS_AND_PROMOTIONS.md`) | `VALIDATE_PROMOTIONS`, `GET_APPLICABLE_PROMOTIONS`, promo engine |
| BL3 (`CART_ACTIVE_ORDER_FLOW_RECOMMENDATIONS.md`) | Cart store patterns, race conditions |
| O21 (`OPTIMIZATION_TRACKER.md`) | Per-issue optimization items for this app |
