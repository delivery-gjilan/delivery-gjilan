# Mobile Customer App — Deep Dive

<!-- MDS:M12 | Domain: Mobile | Updated: 2026-04-13 -->
<!-- Depends-On: A1, B1, B2, B5, B6, BL1, BL3, BL5, M1, M2, M3, M10 -->
<!-- Depended-By: (none yet) -->
<!-- Nav: Customer app architecture, all screens, all hooks/stores, all GraphQL ops, i18n, config, and optimization candidates. -->

## Overview

`mobile-customer` is the consumer-facing app in the Zipp Go platform. It lets customers browse businesses (restaurants, shops, pharmacies), build a cart, place orders, and track deliveries in real-time.

- **App Name:** Zipp Go
- **Bundle ID:** `com.artshabani.mobilecustomer` (iOS + Android)
- **Deep-link Schemes:** `deliveryapp://`, `zipp://`
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19.1
- **Styling:** NativeWind 4 (Tailwind CSS in RN) + custom theme system
- **State:** Zustand 5 + Apollo Client 4
- **i18n:** English (en) + Albanian (al), Zod-validated parity
- **Maps:** @rnmapbox/maps 10.2
- **EAS Project ID:** `e5c04b16-6851-4fce-aa03-e4a183f0becf`

---

## File Structure

```
mobile-customer/
├── app/                      # Expo Router file-based routes
│   ├── _layout.tsx           # Root Stack + global providers
│   ├── index.tsx             # Auth init dispatcher
│   ├── auth-selection.tsx    # Language toggle + login/signup entry
│   ├── login.tsx             # Email/password login
│   ├── signup.tsx            # Multi-step signup (5 steps)
│   ├── forgot-password.tsx   # Password reset request
│   ├── reset-password.tsx    # Password reset (deep-link token)
│   ├── brand-splash.tsx      # Animated splash after auth (2.8s)
│   ├── cart.tsx              # Cart screen (slide_from_bottom)
│   ├── addresses.tsx         # Saved addresses list
│   ├── add-address.tsx       # Add/edit address (map + form)
│   ├── edit-address.tsx      # Alias for add-address
│   ├── (tabs)/               # Main tab navigator
│   │   ├── _layout.tsx       # 4 visible tabs
│   │   ├── home.tsx          # Discover tab (banners, featured, categories)
│   │   ├── restaurants.tsx   # Restaurant listing (filters, pagination)
│   │   ├── market.tsx        # Shops/market tab (category → shop → products)
│   │   ├── profile.tsx       # User profile (cache-only reads)
│   ├── business/[businessId] # Business detail + menu
│   ├── product/[productId]   # Product detail + options + add-to-cart
│   ├── order/[orderId]       # Deep-link alias → /orders/:id
│   ├── orders/               # Orders stack
│   │   ├── _layout.tsx       # Sub-stack navigator
│   │   ├── active.tsx        # Active orders list
│   │   ├── history.tsx       # Order history (paginated, grouped by month)
│   │   └── [orderId].tsx     # Order detail (map + tracking + timeline)
├── modules/                  # Domain modules
│   ├── auth/hooks/           # useAuth (signup/login flow)
│   ├── business/             # BusinessScreen, hooks, 13 components
│   ├── cart/                 # CartScreen, 14 components, 4 hooks, 3 stores
│   ├── orders/               # 5 components, 3 hooks, 1 store
│   └── product/              # ProductScreen, 4 components, 4 hooks
├── components/               # Shared UI components
├── hooks/                    # 18 app-level hooks
├── store/                    # 11 Zustand stores
├── graphql/operations/       # 78+ GraphQL operations
├── gql/                      # Codegen output (auto-generated types)
├── lib/graphql/              # Apollo client, auth session, providers
├── localization/             # en.json, al.json, schema.ts, validate.ts
├── utils/                    # Helpers, constants, themes
├── assets/images/            # App icons, splash, static images
└── plugins/                  # Expo config plugins (Live Activity, Firebase)
```

---

## App Lifecycle & Entry Flow

```
index.tsx (Expo entry)
  └── FCM background handler registered
       └── app/_layout.tsx
            ├── ErrorBoundary
            ├── ApolloProvider (client with persistent cache)
            └── AppContent
                 ├── useStoreStatusInit() → subscription for store open/closed
                 ├── useNotifications() → FCM token registration
                 ├── useActiveOrdersTracking() → order subscription + store sync
                 ├── useBackgroundLiveActivity() → iOS Live Activity updates
                 ├── Store closed check (blocks only if closed on entry)
                 └── Stack Navigator
                      ├── Global overlays: FloatingBars, Toast, SuccessModal,
                      │    OrderReviewModal, AwaitingApprovalModal
                      └── Screens...
```

**Auth initialization** (`app/index.tsx` → `useAuthInitialization`):
1. Load token from SecureStore (iOS Keychain / Android Keystore)
2. If no token → `/auth-selection`
3. If token, run `Me` query
4. On success with `signupStep === 'COMPLETED'` → `/(tabs)/home`
5. On success with incomplete signup → `/signup` (resume)
6. On network error → fall back to persisted user (don't clear token)

**Brand splash** (`brand-splash.tsx`): Animated logo + progress bar over 2.8s. Provides warm-up time for prefetch and cache prep before home screen.

---

## Tab Navigator

| # | Tab | Icon | Screen | Key Behavior |
|---|-----|------|--------|-------------|
| 1 | Discover | compass | `home.tsx` | Banners carousel, category grid, featured restaurants, promo restaurants, open-now list. Out-of-zone check on first load. Focus refetch. |
| 2 | Restaurants | restaurant | `restaurants.tsx` | Status filters (all/open/promo), category filters, FlatList with mixed item types (cards, featured, promo banners), pagination. |
| 3 | Shops | basket | `market.tsx` | State machine: DISCOVER → SHOP → SUBCATEGORY → PRODUCTS. 2x2 category grid, Wolt-style tabs, hero header with collapse. |
| 4 | Profile | person | `profile.tsx` | Cache-only reads. Menu sections: personal info, preferences (language, notifications), settings (theme), account (slide-to-delete). |
Tab bar uses animated underline markers with spring physics (damping: 14, stiffness: 220).

---

## Zustand Stores (11)

| Store | Persistence | Key State |
|-------|-------------|-----------|
| `authStore` | AsyncStorage (user only; token in SecureStore) | `token`, `user`, `isAuthenticated`, `hasHydrated` |
| `storeStatusStore` | None | `isStoreClosed`, `closedMessage`, `wasOpenOnEntry` |
| `toastStore` | None | Non-Zustand wrapper. `success/error/info/warning` methods. |
| `useAwaitingApprovalModalStore` | None | `visible`, `orderId`, `autoOpenOrderId` |
| `useDeliveryLocationStore` | AsyncStorage | `location` (lat, lng, address, label, isOverridden) |
| `useFavoritesStore` | AsyncStorage | `favoriteIds` (Set, serialized as array) |
| `useLocaleStore` | AsyncStorage | `languageChoice` ('en'\|'al'), `translations` |
| `useOrderReviewPreferencesStore` | AsyncStorage | `hiddenForAll`, `hiddenBusinessIds[]`, `handledOrderIds[]` |
| `useOrderReviewPromptStore` | None | `activeOrderId`, `queuedOrderIds[]` |
| `useSuccessModalStore` | None | `visible`, `orderId`, `type`, `phase`, `suppressCartBarUntil` |
| `useThemeStore` | AsyncStorage | `themeChoice` ('light'\|'dark'\|'system') |

**Cart stores** (module-level):
| Store | Persistence | Purpose |
|-------|-------------|---------|
| `cartDataStore` | AsyncStorage | Item array |
| `cartActionsStore` | None (in-memory) | `addItem`, `removeItem`, `updateQuantity`, `clearCart`. Validates one-restaurant-per-cart (markets exempt). |
| `cartAnimationStore` | None | Animation trigger counter (signal for bounce effect + haptic) |

**Orders store** (module-level):
| Store | Purpose |
|-------|---------|
| `activeOrdersStore` | In-memory. Defensive filtering removes DELIVERED/CANCELLED + recently-removed (10s TTL). Methods: `setActiveOrders`, `updateOrder`, `removeOrder`, `patchDriverConnection`, `patchOrderLifecycle`. |

---

## App-Level Hooks (18)

### Setup & Auth
| Hook | Purpose |
|------|---------|
| `useAppSetup` | Hydrate stores, splash screen, font loading |
| `useAuthInitialization` | Token → ME query → route decision |
| `useInitializeTranslation` | Load locale from store, set translations |
| `useSyncTheme` | Sync Zustand theme choice → NativeWind colorScheme |

### Orders & Tracking
| Hook | Purpose |
|------|---------|
| `useActiveOrdersTracking` | `USER_ORDERS_UPDATED` subscription → Apollo cache + Zustand store |
| `useHasActiveOrder` | Boolean derived from activeOrdersStore |
| `useGlobalDriverTracking` | Narrow orderId selector (prevents tree re-renders) |

### Location & Pricing
| Hook | Purpose |
|------|---------|
| `useUserLocation` | Fresh GPS on app start (not persisted) |
| `useServiceZoneCheck` | `GetServiceZones` + ray-casting polygon containment check |
| `useEstimatedDeliveryPrice` | Zone check → haversine distance → tier pricing |

### Background & Notifications
| Hook | Purpose |
|------|---------|
| `useLiveActivity` | iOS Live Activity start/update/end (dynamic island + lock screen) |
| `useBackgroundLiveActivity` | Zustand subscription → updates Live Activity even when backgrounded |
| `useNotifications` | FCM token registration, foreground/background message handlers, interactive categories (Track, Rate, Tip, Support, Refund) |

### Store & Theme
| Hook | Purpose |
|------|---------|
| `useStoreStatus` | Reads from storeStatusStore. `wasOpenOnEntry` flag prevents in-session block. |
| `useTheme` | Reads NativeWind colorScheme, returns navigation-compatible theme |
| `useTranslations` | Returns `t` object + current language |

### Utility
| Hook | Purpose |
|------|---------|
| `useEntranceAnimation` | Staggered fade-up with index-based delay (capped at 8 items) |
| `useAdminOrdersSubscription` | Separate subscription for admin screens (1200ms throttled refetch) |

---

## Module Hooks

### Cart Hooks
| Hook | Purpose |
|------|---------|
| `useCart` | Derived state: total, count, isEmpty |
| `useCartActions` | Action methods (add, remove, update, clear) |
| `useCartProductDetails` | Placeholder/scaffolding (commented-out query) |
| `useCreateOrder` | Maps cart → `CreateOrder` mutation. Blocks if `hasActiveOrders`. Supports promotionId(s), driverTip, prioritySurcharge. |

### Business Hooks
| Hook | Purpose |
|------|---------|
| `useBusiness(id)` | `GetBusiness` (cache-and-network) |
| `useBusinesses` | `GetBusinesses` (cache-and-network) |
| `useProductInCart` | Simple product add. Multi-restaurant validation + haptic. |
| `useComplexProductInCart` | Memoized sum for products with multiple option configs |
| `useProducts` | Re-export bridge to product module |

### Product Hooks
| Hook | Purpose |
|------|---------|
| `useProduct(id)` | `GetProduct` (cache-first) |
| `useProductActions` | Complex add/update with option groups. cartItemId = productId-option1-option2... |
| `useProductCategories` | `ProductCategories` (cache-first) |
| `useProducts(businessId)` | `GetProducts` (cache-and-network) |

### Order Hooks
| Hook | Purpose |
|------|---------|
| `useOrders` | `GetOrders` (cache-and-network → cache-first). Page size 30. Syncs to activeOrdersStore. |
| `useOrdersSubscription` | `USER_ORDERS_UPDATED`. Patches both Apollo cache and Zustand store. Throttled fallback refetch (1200ms + 350ms debounce). |
| `useUncompletedOrders` | `UncompletedOrders` query for non-DELIVERED/CANCELLED orders |

### Auth Hooks
| Hook | Purpose |
|------|---------|
| `useAuth` | Full signup/login lifecycle. Mutations: InitiateSignup, VerifyEmail, SubmitPhoneNumber, VerifyPhone, Login, ResendEmailVerification. Token persisted via SecureStore. |

---

## GraphQL Operations (78+)

### Summary
| Domain | Queries | Mutations | Subscriptions |
|--------|---------|-----------|---------------|
| Auth | 1 | 9 | — |
| Businesses | 4 | — | — |
| Products | 4 | — | — |
| Orders | 7 | 4 | 3 |
| Addresses | 1 | 4 | — |
| Promotions & Pricing | 6 | — | — |
| Banners | 1 | — | — |
| Store & Zones | 2 | — | 1 |
| Notifications | — | 4 | — |
| Admin | 17 | 11 | 3 |
| **Total** | **43** | **32** | **7** |

### Key Operations

**Customer-facing:**
- `GetBusinesses` / `GetBusiness` / `FeaturedBusinessesHome` — business browsing
- `GetProducts` / `GetProduct` — product catalog with variants + option groups
- `CreateOrder` — cart → order (validates pricing, promos, zone)
- `UserOrdersUpdated` (sub) — authoritative order state (drives everything)
- `OrderDriverLiveTracking` (sub) — live driver lat/lng/ETA during delivery
- `StoreStatusUpdated` (sub) — real-time store closure alerts
- `ValidatePromotions` / `GetApplicablePromotions` / `GetPromotionThresholds` — promo engine
- `CalculateDeliveryPrice` — zone + distance-based pricing
- `SubmitOrderReview` — post-delivery star rating + comment + quick feedback chips

**Admin (embedded):**
- `AdminGetOrders` / `AdminGetOrder` / `AdminAllOrdersUpdated` (sub) — order management
- `AdminAssignDriverToOrder` / `AdminStartPreparing` / `AdminCancelOrder` — order actions
- `AdminGetDrivers` / `AdminDriversUpdated` (sub) / `AdminSetDriverOnlineStatus` — driver ops
- `AdminGetSettlements` / `AdminMarkSettlementAsPaid` — settlement management
- `AdminUpdateStoreStatus` — store open/close toggle
- `AdminSendCampaign` — push notification campaigns

### Apollo Client Config
- **Cache:** InMemoryCache with type policies for Order, Business, Product, User, Driver, Settlement, UserAddress, Promotion. `merge: false` on `Order.businesses` and `Business.products`.
- **Persistence:** AsyncStorage, 5MB max, graceful purge on failure.
- **Default fetch policy:** `cache-and-network` first load, then `cache-first`.
- **Auth link:** Skips token for Login/InitiateSignup/VerifyEmail/ResendEmailVerification.
- **WS link:** graphql-ws with exponential backoff (1s → 2s → 5s → 10s), 30s keepAlive.
- **Error handling:** 401 → token refresh + retry. GraphQL errors → toast (unless silentErrors).
- **Token rotation:** JWT parsed with 60s buffer. In-flight deduplication. Auto-logout on 401/403 after refresh fails.

---

## Checkout Flow (3-Step)

```
Step 1: Cart Items          Step 2: Address           Step 3: Review & Confirm
┌─────────────────┐        ┌──────────────────┐      ┌─────────────────────┐
│ Item rows       │   →    │ AddressPicker    │  →   │ OrderReview         │
│ PromotionBar    │        │ Map marker       │      │ PriceBreakdown      │
│ PromoCodeSection│        │ Saved addresses  │      │ Payment method card │
│ DeliverySpeed   │        │ GPS locate       │      │ Driver notes (char  │
│                 │        │ SaveAddressModal │      │   counter)          │
│                 │        │                  │      │ Confirm button with │
│                 │        │                  │      │   total             │
└─────────────────┘        └──────────────────┘      └─────────────────────┘
```

**Cart rules:**
- Only ONE restaurant per cart (markets/pharmacies exempt)
- Adding product from different restaurant clears cart (with confirmation)
- Same product increments quantity (simple) or creates new config entry (with options)
- `cartItemId` = `productId` (simple) or `productId-opt1-opt2...` (complex, sorted)
- Active order blocks checkout (`hasActiveOrders` guard)

**Promotion engine:**
- `PromotionProgressBar` shows spend-threshold progress in business detail.
- `PromoCodeSection` supports manual code entry and applied-promo display.
- Promotions are resolved through `ValidatePromotions` and can include multiple applied promotions in one checkout.

**Apply behavior (current):**
- `CartScreen` auto-applies the highest-priority eligible promotion when no manual promo is active.
- Manual code entry remains available even when an eligible auto-promo is active, so users can override with a code.
- Invalid manual promo attempts show validation feedback and do not clear an already-applied promotion state.
- Auto-applied promotions can be code-less; UI uses a safe display fallback and does not assume `Promotion.code` is always present.
- Auto-applied state shows an inline explanation only when a specific reason exists (for example min-spend unlock); the generic auto-selected sentence is not shown.

**Applied promo UI (current):**
- Applied promo display is lightweight and row-based.
- Each applied promotion is rendered as one row containing coupon identity/code, promo summary, and applied amount.
- If multiple promos are active (for example order discount + free delivery), rows are stacked one-per-promotion.
- Auto-applied promo rows keep neutral explanatory copy and avoid best-savings style marketing labels.

**Global promo visibility (current):**
- Home tab includes a personalized `Your coupons` horizontal strip populated from `getUserPromotions` for the authenticated user.
- Personalized strip includes exclusive/compensation-style user coupons with apply mode (`AUTO`/`CODE`), coupon value summary, and expiry information.

**Business promo cards (current):**
- Business detail promo cards now show compact condition chips (scope/method/target/min-spend/usage/expiry where available).
- Promo details modal also renders the same chip-based breakdown for easier condition scanning.

**Price breakdown behavior (current):**
- Breakdown separates non-delivery promo discount and delivery promo discount.
- Delivery discount row uses `Delivery Promo (...)`; non-delivery uses `Promo (...)`.
- Discount split is derived from validated totals (`subtotal + delivery - finalTotal`) plus `finalDeliveryPrice`, keeping math consistent for combined promotions.

**User feedback and error handling:**
- `PromoAppliedCelebration` provides confetti on promo unlock.
- `PromotionIssueModal` explains invalid/expired/not-combinable promo failures during checkout.

---

## Order Tracking

### Live Tracking Pipeline
```
OrderDriverLiveTracking (subscription)
  → Road-snap to delivery route (if within 45m)
  → Interpolate between updates (ease-out cubic)
  → Dead-reckoning extrapolation (max 4s)
  → Bearing calculation → marker rotation
  → Smooth camera tracking (fitBounds to driver + dropoff)
```

### Map Elements
| Element | Phase | Style |
|---------|-------|-------|
| BusinessMarker | All phases | Pulsing animation during PREPARING |
| VehiclePin (driver) | OUT_FOR_DELIVERY only | Purple (#7C3AED), rotates with heading |
| HomeLocationPin (dropoff) | All active phases | Home icon, white shell |
| Delivery route (LineString) | OUT_FOR_DELIVERY only | #A78BFA, width 5, opacity 0.55         |

### Map Camera
- **PENDING/PREPARING/READY:** Centered on business
- **OUT_FOR_DELIVERY:** fitBounds (driver + dropoff), zoom 13–17, 800ms animation

### Post-Delivery Review
After DELIVERED status, a review prompt is queued:
- Star rating (1–5), optional private comment, quick feedback chips
- One-time per order (tracked in `handledOrderIds[]`)
- Can be suppressed per-business or globally (persisted preferences)
- Appears after success modal closes

---

## Shared Components (35)

### Layout & Global
| Component | Purpose |
|-----------|---------|
| `FloatingBars` | Renders `CartFloatingBar` + `OrdersFloatingBar` as sticky overlays when cart has items / orders are active |
| `AuthGate` | Wraps content requiring auth, shows login prompt if unauthenticated |
| `ErrorBoundary` | Catches render errors, shows fallback UI |
| `LoadingScreen` | Full-screen spinner |
| `StoreClosedScreen` | Blocks app when store closed on entry |

### Modals & Sheets
| Component | Purpose |
|-----------|---------|
| `SuccessModalContainer` | Order-created / order-delivered success with confetti. Auto-dismisses and routes to home. |
| `OrderReviewModal` / `OrderReviewModalContainer` | Post-delivery star rating + comment + quick feedback chips |
| `AwaitingApprovalModal` / `AwaitingApprovalModalContainer` | Approval-required order notification |
| `OutOfZoneSheet` | Bottom sheet when user location is outside service zones |
| `OrderConfirmDialog` | Confirmation before placing order |

### Marketing
| Component | Purpose |
|-----------|---------|
| `PromoSlider` | Horizontal banner carousel on home screen |
| `GlobalPromoBanner` | Platform-wide promo banner |
| `InfoBanner` | Warning/info banner (store status, etc.) |

### UI Kit
| Component | Purpose |
|-----------|---------|
| `Badge`, `Button`, `Card`, `Input` | Standard form elements with theme support |
| `Skeleton` | Loading placeholder (shimmer) |
| `WoltHeader` | Sticky header with scroll-based opacity |
| `Toast` / `ToastContainer` | Toast notification system |
| `ProfileRow` | Menu row with icon + label + arrow |
| `DateTimePicker` | Date/time selection |
| `TrendIndicator` | Trend arrow (up/down/flat) for analytics |
| `Categories` / `CategoryIcons` | Category display (grid + icon variants) |
| `DiscoverSection` | Section wrapper for home screen |

---

## Admin Surface

The customer app route tree is customer-only. Admin routes and admin helper modules are not part of this package.

---

## Localization

- **Languages:** English (`en.json`) + Albanian (`al.json`)
- **Key count:** 500+ strings
- **Validation:** `localization/schema.ts` defines Zod schema; `localization/validate.ts` enforces parity at build time (`npm run prestart` → `validate:translations`)
- **Coverage:** Auth, cart, orders, product, business, profile, home, error messages, status badges, CTAs, modal copy
- **Usage:** `useTranslations()` hook returns `{ t, language }`. All user-visible strings go through `t.section.key`.

---

## Configuration

### Expo Plugins
| Plugin | Purpose |
|--------|---------|
| `expo-router` | File-based routing |
| `@rnmapbox/maps` | Mapbox maps integration |
| `@react-native-firebase/app` | Firebase core |
| `expo-notifications` | Push notifications (color: #0ea5e9, background remote enabled) |
| `expo-splash-screen` | Splash image (light/dark variants) |
| `expo-build-properties` | Native build settings |
| `./plugins/patch-live-activities` | iOS Live Activity support |
| `./plugins/with-live-activity-extension` | iOS Live Activity widget extension |
| `./plugins/fix-firebase-modular-headers` | Firebase modular header fixes |

### Experiments
- `typedRoutes: true` — type-safe route params
- `reactCompiler: true` — React Compiler (auto-memoization)

### EAS Build
- Profiles: `development`, `preview`, `production`
- OTA Updates: `expo-updates` with `production` channel
- Runtime version policy: `appVersion`

### Key Dependencies
| Dependency | Version | Purpose |
|------------|---------|---------|
| `@apollo/client` | 4.0.9 | GraphQL client (v4) |
| `@rnmapbox/maps` | 10.2.10 | Map rendering |
| `@react-native-firebase/messaging` | 23.8.6 | FCM push |
| `@gorhom/bottom-sheet` | 5.2.8 | Bottom sheets |
| `expo-router` | 6.0.14 | File-based routing |
| `react-native-reanimated` | 4.1.1 | Animations |
| `zustand` | 5.0.8 | State management |
| `nativewind` | 4.2.1 | Tailwind in RN |
| `zod` | 3.25.76 | Schema validation |
| `react-native-confetti-cannon` | 1.5.2 | Promo celebration |
| `react-native-gifted-charts` | 1.4.68 | Analytics charts |
| `apollo3-cache-persist` | 0.15.0 | Cache → AsyncStorage |
| `drizzle-orm` | 0.44.7 | Local DB (Expo Drizzle Studio plugin) |

---

## Architecture Patterns

### Dual Auth Storage
Token lives in SecureStore (iOS Keychain / Android Keystore) for security. User object is persisted to AsyncStorage for offline access. On network errors, the app falls back to persisted user without clearing the token — prevents logout on transient failures.

### Subscription Authority
`USER_ORDERS_UPDATED` is the single source of truth for order state. It patches both Apollo cache (GET_ORDERS, GET_ORDER queries) and Zustand `activeOrdersStore`. Fallback refetch fires with 1200ms cooldown + 350ms debounce if subscription apply fails.

### Recently-Removed Tracking
When an order transitions to DELIVERED/CANCELLED, a 10-second TTL "recently removed" entry prevents stale cache backfills from reviving it in the active orders UI.

### Narrow Memoization
Hooks like `useGlobalDriverTracking` use memoized narrow selectors (just orderId) to prevent cascading re-renders across the component tree.

### Live Activity Background Sync
A Zustand subscription in `useBackgroundLiveActivity` updates iOS Live Activity (Dynamic Island + Lock Screen) even when the app is backgrounded. 15-second grace period before falling back to "15 min" ETA estimate.

### Multi-Restaurant Guard
Cart enforces one restaurant per order. Markets and pharmacies are exempt. Adding a product from a different restaurant triggers a confirmation to clear the cart.

### Modal Conflict Guard
iOS limits one modal at a time. Components check pending modal state before presenting to avoid conflicts.

### Cache-Only Profile
Profile tab uses `fetchPolicy: 'cache-only'` — zero network calls. The root-level subscription keeps cache fresh so profile reads are instant.

---

## Optimization Recommendations

### Performance
1. **`useCartProductDetails` is scaffolding** — the hook has commented-out query code. Either implement it or remove the file to avoid confusion.
2. **Analytics tab hidden but rendered** — `analytics.tsx` is still mounted in the tab navigator even though it's hidden. If unused, removing it saves bundle size and prevents any background renders.
3. **Apollo cache size** — 5MB cache persist limit is generous. Monitor actual cache sizes in production; consider reducing or adding selective eviction for old order data.
4. **Subscription fan-out** — `UserOrdersUpdated` pushes full order lists. Consider a lighter subscription payload with just changed order IDs + delta, fetching full data only when needed.
5. **Image optimization** — `expo-image` (used for business/product images) should leverage blur hash placeholders if not already. Check CDN-side image resizing for thumbnails vs detail views.

### Code Quality
6. **Feature boundary discipline** — Keep this package customer-focused and avoid adding role-specific operational surfaces directly into the app router.
7. **Store naming inconsistency** — Some stores use `useXStore` naming (e.g., `useThemeStore`), others don't (e.g., `authStore`, `storeStatusStore`). Standardize to one convention.
8. **Module cross-imports** — The README states "modules do not import from each other," but cart hooks reference business hooks (e.g., `useProductInCart` lives in business module but manipulates cart). Consider clarifying which module owns product-cart interactions.
9. **Profile `as any` cleanup** — OrderDetails previously had `as any` workarounds for translation keys that have been partially cleaned up. Audit for any remaining type assertions.

### Reliability
10. **Deep-link token handling** — `reset-password.tsx` expects a `token` query param from email deep links. Verify the Expo linking config properly extracts this across universal links (iOS) and app links (Android).
11. **Service zone fallback** — `useServiceZoneCheck` returns `'unconfigured'` if no zones or no permission, permitting entry. This is correct for launch but should be revisited as zones mature.
12. **FCM token lifecycle** — `RegisterDeviceToken` mutation fires on app start. Verify `UnregisterDeviceToken` is called on logout to prevent orphan tokens.

### Future Considerations
13. **Offline mode** — Cart data is persisted to AsyncStorage, but there's no offline order queue. If connectivity is unreliable in delivery zones, consider optimistic order creation with retry.
14. **Search** — No product/business search feature exists yet. The home and restaurant tabs rely on scroll + filter. A search bar with debounced query would improve discoverability.
15. **Accessibility** — No explicit accessibility labels or roles observed in the component analysis. Adding `accessibilityLabel` and `accessibilityRole` props would improve screen reader support.
16. **Testing** — Vitest config exists but test coverage appears limited to `utils/__tests__/`. Consider adding component tests for critical flows (cart actions, order creation, auth flow).
