# Web Customer — Architecture & Developer Reference

The `web-customer/` folder is a **Next.js 16 App Router** application — the browser-based customer-facing frontend for the Zipp Go delivery platform. It runs alongside the mobile apps as an alternative interface for placing orders.

---

## Tech Stack

| Concern | Library / Version |
|---|---|
| Framework | Next.js 16.2.3 (App Router, Turbopack dev) |
| UI | React 19, Tailwind CSS v4 |
| Data fetching | Apollo Client 4.1.7 (GraphQL) |
| Realtime | `graphql-ws` WebSocket subscriptions |
| State | Zustand 5 |
| Maps | MapLibre GL + `react-map-gl` |
| Localization | Custom i18n context (EN + AL) |
| Icons | `lucide-react` |
| Validation | Zod 4 |
| Date formatting | `date-fns` 4 |

---

## Directory Structure

```
web-customer/
  src/
    app/
      layout.tsx              # Root HTML shell, theme init script, Providers wrapper
      globals.css             # CSS variables (design tokens), Tailwind import
      providers.tsx           # ApolloProvider + AuthProvider + I18nProvider
      (main)/
        layout.tsx            # Authenticated shell: Header, Footer, CartFloatingBar, ActiveOrderBanner
        page.tsx              # Home page — businesses list + banners + featured
        market/
          page.tsx            # Market (grocery) page
        business/[businessId]/
          page.tsx            # Business detail page — product catalogue with category tabs
        checkout/
          page.tsx            # Multi-step checkout (address → review → payment)
        cart/                 # Cart review page
        orders/
          page.tsx            # Order history (active / past tabs)
          [orderId]/          # Order detail + live tracking
        addresses/            # Saved addresses management
        profile/              # Profile & settings
        product/              # Standalone product detail (if needed)
      login/                  # Login page
      signup/                 # Signup page
      forgot-password/
      reset-password/
    components/
      layout/
        Header.tsx            # Sticky top nav — desktop nav links, mobile tab bar, search bar
        Footer.tsx
        CartFloatingBar.tsx   # Pulsing floating button; shows when cart non-empty
        ActiveOrderBanner.tsx # Banner for in-progress orders; polls every 30s
      business/
        BusinessCard.tsx      # Card used on home/market business listings
        ProductOptionsModal.tsx # Modal for products with option groups or variants
      checkout/
        AddressPickerMap.tsx  # MapLibre map for selecting delivery location
      home/
        BannerCarousel.tsx    # Rotating hero banners
        CategoryGrid.tsx
      orders/
        OrderTrackingMap.tsx  # Live driver location map for active orders
      ui/                     # Generic primitives: Button, Badge, Skeleton, etc.
    graphql/
      operations/             # All GQL queries/mutations, one file per domain:
        businesses/           # GET_BUSINESSES, GET_BUSINESS, GET_FEATURED_BUSINESSES, GET_BUSINESS_MINIMUM
        products/             # GET_PRODUCTS, GET_PRODUCT_CATEGORIES, GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS
        addresses.ts
        auth/                 # LOGIN_MUTATION, ME_QUERY
        banners.ts            # GET_ACTIVE_BANNERS
        deliveryPricing.ts    # CALCULATE_DELIVERY_PRICE
        orders/               # GET_ORDERS, CREATE_ORDER, GET_PRIORITY_SURCHARGE_AMOUNT
        promotions.ts         # VALIDATE_PROMOTIONS, GET_APPLICABLE_PROMOTIONS
        serviceZone.ts        # GET_SERVICE_ZONES
        store.ts
    hooks/
      useHydratedBusinesses.ts  # Fetches business list then lazy-loads detail for each
    lib/
      auth-context.tsx        # AuthProvider + useAuth hook
      graphql/
        apollo-client.ts      # Apollo client factory (see below)
      utils.ts                # formatPrice, formatDate, cn (tailwind-merge)
    localization/
      index.tsx               # I18nProvider + useTranslations hook
      en.json                 # English strings
      al.json                 # Albanian strings
    store/
      cartStore.ts            # Zustand cart (persisted to localStorage)
      searchStore.ts          # Zustand global search query (ephemeral)
      favoritesStore.ts       # Zustand favourites
```

---

## Apollo Client (`src/lib/graphql/apollo-client.ts`)

### Link chain

```
Subscriptions  → GraphQLWsLink  (WebSocket, lazy, auth via connectionParams)
Queries/Mutations → errorLink → authLink → httpLink
```

The split is done at runtime via `getMainDefinition` — subscriptions go to WS, everything else to HTTP.

### Auth flow

- Tokens stored in `localStorage`: `authToken`, `refreshToken`, `userData`
- `authLink` (`setContext`) calls `getValidAccessToken()` before every request
- `getValidAccessToken()` proactively refreshes if the JWT has <60s left (`parseJwtExpiryMs`)
- A single `refreshPromise` singleton prevents concurrent refresh races
- `errorLink` listens for `UNAUTHENTICATED` and redirects to `/login`
- WebSocket reconnects with exponential back-off: `[1s, 2s, 5s, 10s]`, infinite retries

### InMemoryCache type policies

All main entities are normalised by `id`:

```ts
typePolicies: {
  Business, Product, ProductCategory, ProductSubcategory,
  OptionGroup, Option, Banner, Promotion  // all keyed by ["id"]
}
```

List fields (`businesses`, `products`, `productCategories`, `productSubcategoriesByBusiness`, `banners`) use `merge: false` to prevent stale-append bugs on re-fetch.

### Default fetch policies

```ts
defaultOptions.watchQuery.fetchPolicy = "cache-first"
defaultOptions.query.fetchPolicy       = "cache-first"
notifyOnNetworkStatusChange            = false
```

Queries that intentionally override this:
- `GET_ORDERS` in `ActiveOrderBanner` — `cache-and-network` + `pollInterval: 30_000` (live tracking)
- `GET_ORDERS` in orders page — `no-cache` (always fresh)
- `GET_MY_ADDRESSES`, `GET_SERVICE_ZONES` in checkout — `cache-and-network`
- `CALCULATE_DELIVERY_PRICE`, `ME_QUERY` — `network-only`
- `useHydratedBusinesses` initial fetch — `cache-and-network`

---

## Design System

All design tokens are CSS variables defined in `globals.css`. **Never hardcode colours.**

### Key CSS variables

| Variable | Purpose |
|---|---|
| `--primary` | Brand blue (`#009de0` light / `#38bdf8` dark) |
| `--primary-hover` | Darker shade for hover states |
| `--background` | Page background |
| `--background-secondary` | Header/card background |
| `--foreground` | Primary text |
| `--foreground-secondary` | Secondary/muted text |
| `--card` | Card background |
| `--border` | Default border |
| `--muted` | Placeholder / icon colour |
| `--radius` | `12px` default border radius |
| `--header-height` | `64px` |
| `--max-content-width` | `1480px` max page width |

### Dark mode

The `html` element starts with `class="dark"`. A `beforeInteractive` script in `layout.tsx` reads `localStorage("theme")` and toggles the class before first paint to avoid flash. Users can toggle via the globe icon in the header.

---

## Authentication (`src/lib/auth-context.tsx`)

`AuthProvider` wraps the app and exposes `useAuth()`:

```ts
{
  user: User | null          // id, email, firstName, lastName, role, ...
  loading: boolean
  authCheckComplete: boolean  // true after initial localStorage check
  isAuthenticated: boolean
  needsSignupCompletion: boolean  // signupStep !== "COMPLETED"
  login(email, password): Promise<void>
  loginWithToken(token, refreshToken, userData): void
  logout(): void
  setUser(user): void
}
```

Auth state is bootstrapped from `localStorage` on mount (no server-side session). The JWT is passed in every Apollo request via `authLink`.

---

## State Management (Zustand)

### `cartStore` — persisted to `localStorage`

```ts
items: CartItem[]
addItem(item)       // merges if same productId + variantId + selectedOptions
removeItem(id)
updateQuantity(id, qty)  // removes if qty <= 0
clearCart()
clearBusinessItems(businessId)
getBusinessId()     // returns the single businessId currently in cart (null if empty)
getTotal()
getItemCount()
```

`CartItem` has: `productId`, `businessId`, `businessName`, `name`, `imageUrl`, `unitPrice`, `quantity`, `notes`, `selectedOptions: CartItemOption[]`, optional `variantId/variantName`.

The cart is single-business — adding from a different business requires confirming a clear.

### `searchStore` — ephemeral

```ts
query: string
setQuery(q): void
```

Used by Header (debounced 350ms), Market page (also debounced 350ms inline), and Home page for filtering. Cleared when navigating away from search-enabled routes (`/` and `/market`).

### `favoritesStore`

Persisted favourite business IDs.

---

## Routing Overview

All routes under `(main)/` share the `MainLayout` (Header + Footer + CartFloatingBar + ActiveOrderBanner). Auth routes (`/login`, `/signup`, etc.) are outside the group and get no shell.

| Route | Page | Auth required |
|---|---|---|
| `/` | Home — businesses + banners | No |
| `/market` | Market (grocery store) | No |
| `/business/[businessId]` | Business catalogue | No |
| `/checkout` | Checkout flow | Yes |
| `/cart` | Cart review | Yes |
| `/orders` | Order list | Yes |
| `/orders/[orderId]` | Order detail + tracking | Yes |
| `/addresses` | Saved addresses | Yes |
| `/profile` | Profile settings | Yes |
| `/login` | Login | — |
| `/signup` | Signup | — |
| `/forgot-password` | Forgot password | — |
| `/reset-password` | Reset password | — |

---

## Key Pages

### Home (`/`)

- `useHydratedBusinesses()` — fetches basic business list then parallel-loads full details
- `GET_FEATURED_BUSINESSES` — curated list shown at top
- `GET_ACTIVE_BANNERS` with `displayContext: "HOME"` — hero carousel; falls back to template banners
- `useSearchStore` filters the business list client-side

### Market (`/market`)

- Finds the single `businessType === "MARKET"` business from `GET_BUSINESSES`
- Fetches its products, categories, subcategories
- Layout: **sticky underline category tabs** → **sticky subcategory tabs** → product grid
- Search is embedded inline in the sticky tab row (desktop); mobile search is in the Header
- All filtering is client-side — no server round-trip for category/subcategory switching
- Debounced 350ms before writing to `searchStore`

### Business Detail (`/business/[businessId]`)

- Queries `GET_BUSINESS`, `GET_PRODUCTS`, `GET_PRODUCT_CATEGORIES`
- Products grouped by category, displayed as **horizontal cards** (image right, content left)
- **Sticky underline category tabs** at `top-0 md:top-16` scroll the page to section on click; IntersectionObserver updates the active tab while scrolling
- Products without option groups: inline `− qty +` strip on the card
- Products with option groups or variants: opens `ProductOptionsModal`
- `ProductOptionsModal` fetches full `GET_PRODUCT` (with option groups) on open, `cache-first`

### Checkout (`/checkout`)

Multi-step: **Step 1** address selection (map picker + saved addresses) → **Step 2** order review + promo code → **Step 3** confirmation / place order.

Queries: `GET_MY_ADDRESSES`, `GET_SERVICE_ZONES`, `CALCULATE_DELIVERY_PRICE` (lazy), `VALIDATE_PROMOTIONS`, `GET_APPLICABLE_PROMOTIONS`, `CREATE_ORDER` mutation.

### Orders (`/orders`)

- Tabs: **Active** / **History**
- `fetchPolicy: "no-cache"` — always fresh
- Links to `/orders/[orderId]` for detail + live map tracking (`OrderTrackingMap`)

---

## Layout Components

### `Header`

- **Desktop:** sticky `h-16` bar with logo, nav links (Home / Market / Orders), search input (shown on `/` and `/market`), language toggle, user menu / login button
- **Mobile:** sticky `h-14` search bar (top), bottom tab bar fixed at bottom with Home / Market / Orders / Profile tabs
- Search input debounced 350ms before writing to `searchStore`
- Clears search state when navigating away from search-enabled routes

### `CartFloatingBar`

- Fixed bottom-center; hidden on `/cart`, `/checkout`, `/login`, `/signup`
- Pulsing ring animation via `animate-ping`
- Redirects unauthenticated users to `/login?next=/cart`

### `ActiveOrderBanner`

- Polls `GET_ORDERS` every 30s for active statuses (`PENDING`, `PREPARING`, `READY_FOR_PICKUP`, `PICKED_UP`, `ON_THE_WAY`)
- Hidden on order detail pages, checkout, login, signup
- Shows most recent active order with coloured status dot and link to order detail

---

## Localization

`useTranslations()` returns `{ t, locale, setLocale }`.

- `t("some.key")` — dot-path lookup into `en.json` / `al.json`; humanises key as fallback
- `t("key", { name: "John" })` — interpolation with `{{name}}` or `{name}` placeholders
- Locale defaults to `"en"`, persisted to `localStorage("preferred-locale")`
- Supported: `"en"` (English), `"al"` (Albanian)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | GraphQL HTTP endpoint (default: `http://localhost:4000/graphql`) |
| `NEXT_PUBLIC_WS_URL` | GraphQL WebSocket endpoint (default: `ws://localhost:4000/graphql`) |

---

## Development

```bash
cd web-customer
npm run dev      # Turbopack dev server
npm run build
npm run typecheck
npm run codegen  # Regenerate GraphQL types from schema
```
