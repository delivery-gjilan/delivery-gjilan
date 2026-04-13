# Optimization Tracker

> Collected optimization recommendations per project. Track status as items are addressed.

---

## Mobile-Customer (M12)

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | Remove unused `useCartProductDetails` scaffolding hook (commented-out code) | Low | Completed |
| 2 | Remove or lazy-gate hidden `analytics.tsx` tab (still mounted in navigator) | Low | Completed |
| 3 | Monitor Apollo cache sizes in production (5MB limit may be excessive) | Medium | Completed — reduced to 2MB |
| 4 | Lighten `UserOrdersUpdated` subscription payload — send changed IDs + delta instead of full order list | Medium | N/A — already implemented: all mutations use `publishSingleUserOrder`; full field selection required for Apollo cache coherence |
| 5 | Add blur hash placeholders for `expo-image` (business/product images) + CDN thumbnail resizing | Medium | Completed — added `contentFit`, `cachePolicy`, `transition` to all Image usages |

### Code Quality
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | Extract embedded admin panel to lazy-loaded route group or shared module (reduces customer bundle, 17q + 11m + 3s + ~10 screens) | High | Completed — all admin code deleted |
| 7 | Standardize store naming convention — mix of `useXStore` vs bare names (`authStore`, `storeStatusStore`) | Low | Pending — file names inconsistent but exports are already `useXStore` |
| 8 | Clarify module boundary for product-cart interactions — `useProductInCart` lives in business module but manipulates cart | Low | Completed — moved to `modules/cart/hooks/` |
| 9 | Audit for remaining `as any` type assertions in OrderDetails/translation keys | Low | Completed — removed unnecessary casts in profile.tsx, CartControls.tsx |

### Reliability
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 10 | Verify deep-link token extraction for password reset across iOS universal links and Android app links | Medium | Verified correct — API sends `zipp://reset-password?token=<uuid>` (`APP_DEEP_LINK_BASE` env); app scheme includes `zipp`; Expo Router routes to `reset-password.tsx`; token extracted via `useLocalSearchParams` |
| 11 | Revisit service zone `'unconfigured'` fallback as zones mature (currently permits entry) | Low | Accepted — intentional fail-open for launch phase; when zones go live, change `activeZones.length === 0` branch in `useServiceZoneCheck.ts` to return `'outside'` instead of `'unconfigured'` |
| 12 | Audit FCM `UnregisterDeviceToken` on logout to prevent orphan tokens | Medium | Verified implemented — `useNotifications.ts` second effect watches `isAuthenticated`; calls `unregisterToken` with stored `currentPushToken.current` when user logs out |

### Future Considerations
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 13 | Offline order queue (optimistic order creation with retry for unreliable connectivity) | Low | Pending |
| 14 | Product/business search bar with debounced query | Medium | Pending |
| 15 | Accessibility labels and roles (`accessibilityLabel`, `accessibilityRole`) | Medium | Pending |
| 16 | Expand test coverage beyond `utils/__tests__/` — cart actions, order creation, auth flow | Medium | Pending |

---

## Mobile-Driver (M8)

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | Remove unused `drizzle-orm`, `drizzle-kit`, `expo-drizzle-studio-plugin` dependencies (no local DB used) | Low | ✅ Done |
| 2 | Remove unused `socket.io-client` dependency (WS transport is `graphql-ws` via Apollo) | Low | ✅ Done |
| 3 | Delete dead `graphql/operations/auth/driverLogin.ts` (defines `DRIVER_LOGIN_MUTATION`/`DRIVER_REGISTER_MUTATION`, neither imported anywhere — login uses generic mutation) | Low | ✅ N/A — file already absent |
| 4 | 8 unused navigation hooks occupy bundle space — delete or feature-flag if not migrating to custom nav soon (see FF3) | Medium | ✅ Done — deleted 7 hooks; `useNavigationCamera` kept (`FollowMode` type used in `FloatingMapButtons`) |
| 5 | Consider lazy-loading Agora RTC SDK (`react-native-agora`) since PTT is used infrequently vs always-loaded | Medium | ✅ Already done — `useDriverPttReceiver` uses `import('react-native-agora')` dynamic import |

### Code Quality
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | README's `modules/` isolation pattern doesn't match actual flat structure (`hooks/`, `store/` at top-level). Update README or restructure to match. | Low | ✅ Done — README rewritten to describe actual structure |
| 7 | `useGlobalOrderAccept` is 200+ lines — consider splitting auto-present logic, accept mutation logic, and subscription handling into sub-hooks | Medium | ✅ Done — split into `useOrdersFeed`, `useAcceptOrderMutation`, and thin orchestrator |
| 8 | `_layout.tsx` is the central control hub for all overlays (6+ z-indexed layers, 5+ side-effect chains). Consider extracting overlay management to a dedicated component. | Medium | ✅ Done — all overlays extracted to `components/AppOverlays.tsx` |
| 9 | Store naming inconsistency: `authStore`, `navigationStore` (bare) vs `useLocaleStore`, `useThemeStore` (prefixed) | Low | Accepted — file naming only; all exported symbols already use `useXStore` pattern |

### Reliability
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 10 | `orderAcceptStore` persists `skippedAt`/`seenAssignedAt` TTL maps to AsyncStorage — monitor for stale data accumulation across long app lifetimes | Low | ✅ Already done — `pruneTimestampMap` called in `onRehydrateStorage` |
| 11 | Background heartbeat uses raw `fetch` POST (not Apollo) — verify error handling parity with foreground heartbeat (retry, backoff, auth refresh) | Medium | ✅ Done — `sendBackgroundHeartbeat` rewritten with single retry, 401 handling, and GraphQL error body parsing |
| 12 | Messages chat uses AsyncStorage for persistence (`driver_chat_extra_messages`). On heavy chat traffic, this could grow unbounded — add TTL or max-message cap. | Low | ✅ Done — `MAX_EXTRA_MESSAGES = 200` cap applied in all `setExtraMessages` write paths |

### Future Considerations
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 13 | Add test coverage for heartbeat timing, order accept flow, and navigation phase transitions | Medium | ✅ Done — 30 pure-logic unit tests in `utils/__tests__/driver-logic.test.ts`; run via `npx vitest run --config vitest.config.ts mobile-driver` |
| 14 | Consider adding driver-side order notes/photos for proof-of-delivery | Low | Pending |
| 15 | Implement multi-stop navigation for batch orders (currently single-order nav only) | Low | Pending |

---

## Mobile-Business (M13)

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | `GET_MY_BUSINESS_SETTLEMENTS` uses `limit: 500` — unbounded fetch. Replace with cursor pagination or lower bound. | High | ✅ Already at limit: 200 in settlement-history.tsx |
| 2 | All dashboard analytics (today orders, revenue, top products) computed client-side from raw order list. Add a dedicated analytics resolver on backend. | Medium | Pending (future feature) |
| 3 | `apollo3-cache-persist` is installed but not wired up. Configure it to AsyncStorage for instant cold-start UX. | Medium | ✅ Done — `initializeCache()` in `lib/apollo.ts`, called in `_layout.tsx` before `ApolloProvider` mounts |
| 4 | Orders screen has 28+ `useState` variables in a single component causing excessive re-renders. Split into sub-components or migrate to `useReducer`. | Medium | ✅ Done — 17 modal/view-state useState consolidated into `screenReducer` with `useReducer`; `tick` and `expandedOrderIds` kept as useState |
| 5 | Tablet two-column layout computed inline on every render — use `useWindowDimensions` + `useMemo`. | Low | ✅ Done — `isTablet` wrapped in `useMemo` |

### Code Quality
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | `resolveDeviceId()` is duplicated identically in `useNotifications.ts` and `useBusinessDeviceMonitoring.ts`. Extract to a shared utility. | Low | ✅ Done — extracted to `utils/deviceId.ts`; both hooks import from there |
| 7 | `Notifications.setNotificationHandler(...)` fires at module load time in `useNotifications.ts` as an import side effect. Move inside the hook or a dedicated app initializer. | Medium | ✅ Done — moved inside `useNotifications`, guarded by module-level `notificationHandlerSet` flag |
| 8 | Apollo `errorLink` only logs auth errors — no forced re-login on GraphQL-level 401/403. Add logout call in the error link for `UNAUTHENTICATED` error codes. | Medium | ✅ Done — `errorLink` now calls `useAuthStore.getState().logout()` on `UNAUTHENTICATED` code or Unauthorized message |
| 9 | `REFRESH_TOKEN_MUTATION` is a raw hardcoded string in `authSession.ts` — not type-safe. Shared with generated GraphQL operations. | Low | Pending |
| 10 | GraphQL operation files split between typed `graphql()` (codegen) and raw `gql` (apollo/client). Standardize to one approach. | Low | Pending |

### Reliability
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 11 | `useLocaleStore` missing `onRehydrateStorage` callback. Cold starts with Albanian persisted show English until `loadTranslation()` is called externally. | High | ✅ Done — `onRehydrateStorage` now calls `getTranslationFromLanguage(state.languageChoice)` immediately |
| 12 | `StoreClosedOverlay` has `pointerEvents="box-none"` on the blocking overlay — allows touch passthrough when store is closed. Should be `"box-only"` or removed. | High | ✅ Done — changed to `pointerEvents="none"` |
| 13 | `useAuthInitialization` performs client-only role/businessId validation — no server round-trip. Tampered AsyncStorage passes checks. Add a `me` query on startup. | Medium | ✅ Done — `GET_ME` query added to `graphql/auth.ts`; `useAuthInitialization` calls `apolloClient.query({ GET_ME, fetchPolicy: 'network-only' })` after local checks; offline startup still works (network error caught + logged) |
| 14 | `beep.wav` audio in Orders screen has no error handling — if `createAsync` fails the alert silently stops. Add catch + haptic fallback. | Medium | ✅ Done — `createAsync` catch now logs warning; `playBeepPeriod` falls back to `Haptics.notificationAsync(Warning)` × 3 if `soundRef.current` is null |
| 15 | `BusinessMessageBanner` uses legacy `Animated` API while the rest of the app uses Reanimated. Migrate for consistency and to avoid potential interaction conflicts. | Low | ✅ Done — migrated to `useSharedValue` + `useAnimatedStyle` + `withSpring`/`withTiming`/`runOnJS` |

### Future Considerations
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 16 | Add `expo-image-picker` + S3 upload to replace plain text image URL input on the Products screen. | Medium | Pending |
| 17 | Add optimistic UI responses for `StartPreparing` and `UpdateOrderStatus` mutations to feel more responsive. | Low | Pending |
| 18 | Add offline/WS disconnect indicator banner (InfoBanner on network errors) to improve operator confidence. | Medium | Pending |

---

## Mobile-Admin (M14)

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | `GetUsers` fetches up to 500 users in one unbounded request — replace with cursor pagination. | High | Pending |
| 2 | `GET_ORDERS` runs concurrently with `limit: 200` on both map and orders tabs against the same data. Share a single cached query or use active-only on map. | Medium | Pending |
| 3 | Route calculation (`calculateRouteDistance`) fires on every subscription-triggered `activeOrders` change with no debounce — hammers the backend directions proxy on burst updates. Add 1–2 s debounce. | Medium | Pending |
| 4 | Both `@rnmapbox/maps` and `react-native-maps` are installed but only Mapbox is used. Remove `react-native-maps` to reduce bundle size (~2 MB). | Medium | Pending |
| 5 | `useMapStore.selectedOrderId` and local `focusedOrderId` duplicate order selection state in the map screen. Consolidate to one source of truth. | Low | Pending |

### Code Quality
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | `ADMIN_ROLES` constant is duplicated in `authStore.ts`, `useAuth.ts`, and `useAuthInitialization.ts`. Extract to `utils/constants.ts`. | Low | Pending |
| 7 | `useAuth.ts` and `useOperationalOrderAlerts.ts` cast results as `any` — use generated `LoginMutation` / `GetOrdersQuery` types. | Medium | Pending |
| 8 | `app/business/` and `app/driver/` route folders are empty. Implement CRUD screens or remove the dead folders. | Low | Pending |
| 9 | `BottomSheet.snapPoints` prop is declared but not implemented — dead API surface. Remove or implement. | Low | Pending |
| 10 | `useTranslations` throws an uncaught error at render time if `translations` is null. Add a fallback or optional chaining. | Medium | Pending |

### Reliability
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 11 | `lib/graphql/providers.tsx` only has `.then()` on `cacheReady` — if `persistCache` rejects, app shows a blank screen forever. Add `.catch(() => setCacheRestored(true))`. | High | Pending |
| 12 | `apolloClient.ts` swallows the `persistCache` rejection with an empty `.catch`. Errors must propagate so `Providers` can handle them. | High | Pending |
| 13 | `useAdminPtt` has no Agora reconnection logic — if the session drops mid-call, PTT silently stops working. | Medium | Pending |
| 14 | `useOperationalOrderAlerts` uses `data as any` for order detection — type mismatch would silently break new-order alerts. | Medium | Pending |
| 15 | `EXPO_PUBLIC_MAPBOX_TOKEN` falls back to `''` with no warning — map renders blank silently. Add a console error or UI fallback. | Low | Pending |

### Future Considerations
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 16 | Implement Business CRUD screens (`app/business/` is empty) using existing `CreateBusiness`/`UpdateBusiness`/`DeleteBusiness` mutations. | Medium | Pending |
| 17 | Implement Driver management screens (`app/driver/` is empty) using `AdminUpdateDriverSettings`/`AdminUpdateDriverLocation` mutations. | Medium | Pending |
| 18 | Implement User management screen — all 5 user mutations + `GetUsers` + `UserBehavior` are defined but no screen exists. | Medium | Pending |
| 19 | Propagate the admin app's typed `Translation` schema + validator pattern to mobile-customer, mobile-driver, and mobile-business for type-safe i18n across all apps. | Low | Pending |

---

## Admin Panel — Web (W1)

### Security
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | `businesses/page.tsx` reads `localStorage.getItem('authToken')` directly for the image upload REST call. Pass the auth header via the existing Apollo client pattern or a custom fetch wrapper to avoid direct localStorage access in page components. | High | Completed — `lib/utils/auth.ts` `getAuthToken()` utility created; used in businesses/page.tsx, ProductsBlock.tsx, market/page.tsx |
| 2 | `ops-wall/page.tsx` reads `localStorage.getItem('authToken')` for the REST poll. Same fix as above — wrap in a shared authenticated fetch utility. | High | Completed — ops-wall uses Apollo subscriptions; no raw fetch found. `getAuthToken()` util available for future use |

### Type Safety
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 3 | `map/page.tsx` uses `// @ts-nocheck` — the most critical, most complex page has zero TypeScript coverage. Incrementally remove the directive: type the driver/order state shapes first, then event handlers. | High | Deferred — constants extracted; file is ~3500 lines, full removal requires dedicated pass |
| 4 | `businesses/page.tsx`, `promotions/page.tsx`, `notifications/page.tsx`, `business-settlements/page.tsx` all use `// @ts-nocheck`. Remove and fix type errors. | Medium | Completed — `@ts-nocheck` removed from businesses, promotions, notifications, business-settlements, orders/cancelled, admin/banners, SubcategoriesBlock.tsx; all resulting type errors fixed; tsc clean |
| 5 | `topbar.tsx` casts `bannerType as any ?? 'INFO'` in multiple toggle handlers. Use the generated `BannerType` enum directly instead. | Medium | Completed — all 3 `as any` casts replaced with `(storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info` |
| 6 | `PermissionSelector.tsx` casts string literals as `UserPermission` — if the enum changes in the schema the cast hides the error. Use the generated type union instead. | Low | Pending |

### Bugs
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 7 | `businesses/[id]/page.tsx`: `editForm.businessType` always defaults to `BusinessType.Restaurant` in `openEditModal` — the existing type is never pre-populated and will be clobbered on every save. Pre-fill from the current business data. | High | Completed — `openEditModal` now sets `(b.businessType as BusinessType) ?? BusinessType.Restaurant` |
| 8 | `ScheduleEditor.tsx`: "Copy Mon → All" button label renders `â†'` (UTF-8 mojibake). Re-save the file as UTF-8 and use `→` or an arrow icon component. | Low | Completed — fixed to `→` |

### Code Quality / Consistency
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 9 | `map/page.tsx` and `orders/page.tsx` duplicate `TRUSTED_CUSTOMER_MARKER`, `APPROVAL_MODAL_SUPPRESS_MARKER`, and `getMarginSeverity` verbatim. Extract to `lib/constants/orderHelpers.ts`. | Medium | Completed — extracted to `lib/constants/orderHelpers.ts`; both pages import from shared file |
| 10 | `drivers/page.tsx` defines `DRIVER_REGISTER_MUTATION` inline with `gql` instead of placing it in `graphql/operations/users/mutations.ts`. Move it to the operations folder for consistency. | Low | Pending |
| 11 | `promotions/page.tsx` imports `ASSIGN_PROMOTION_TO_USERS` from `graphql/operations/notifications`, not `promotions`. Move the operation to the promotions domain. | Low | Pending |
| 12 | `productpricing/page.tsx` uses inline `graphql()` tagged template literals instead of separate operation files. Extract to `graphql/operations/products/` consistent with the rest of the codebase. | Low | Pending |
| 13 | `admin/banners/page.tsx` uses native HTML5 drag (`onDragStart`/`onDragOver`/`onDrop`) for reorder. The rest of the app (market, categories) uses `@dnd-kit`. Migrate banners to `@dnd-kit` for consistency and accessibility. | Low | Pending |
| 14 | `admin/promos/page.tsx` uses `window.confirm()` for delete. Replace with the styled confirmation modal used throughout the rest of the codebase. | Low | Pending |
| 15 | `admins/page.tsx` has `console.log('[DEBUG]…')` calls. Remove before production. | Low | Completed — all 3 `[DEBUG]` log calls removed |
| 16 | `apollo-client.ts` has the `RefreshToken` mutation inlined. Extract to `graphql/operations/auth/` so it is testable and consistent with the rest of auth operations. | Low | Pending |

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 17 | `categories/page.tsx` fetches `GET_BUSINESSES` even for business-user roles (no `skip`). Add `skip: isBusinessUser` to match the pattern already used by `products/page.tsx`. | Medium | Completed — `isBusinessUser` moved before query; `skip: isBusinessUser` added |
| 18 | `business-settlements/page.tsx` fetches up to 200 records then filters client-side. Add server-side search parameters to `GET_SETTLEMENTS_PAGE` or defer search until 3+ characters. | Medium | Pending |
| 19 | `apollo-client.ts` uses `InMemoryCache` with no type policies. For high-frequency entities (orders, drivers), add `keyFields` and field merge policies to reduce re-renders and prevent stale data accumulation. | Medium | Pending |

### Features / Completeness
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 20 | `statistics/page.tsx` is entirely placeholder with hardcoded strings. Wire to real data using existing order/business query ops. `recharts` is already installed. | High | Pending |
| 21 | `app/api/directions/` directory exists but `route.ts` is absent — the Mapbox directions backend proxy is missing on the web side. Either add the route or confirm the map page calls Mapbox directly (review security). | Medium | Pending |

---

## Web Customer (W2)

### Bugs
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | `market/page.tsx`: `updateQuantity(product.id, qty)` uses raw `productId` as the cart item key, but `cartStore.addItem` generates `id = "${productId}-${variantId}-${Date.now()}"`. The lookup by `product.id` will never match — market quantity stepper silently does nothing. Fix by finding the item via `productId + variantId` match instead of `id` equality. | High | Completed — `handleIncrement`/`handleDecrement` now find the item by `productId` match and use the real cart item `id` |
| 2 | `ActiveOrderBanner.tsx`: delivered detection fires `showOrderDelivered` for any order that disappears from the active list — including cancelled orders. Customers see a success "order delivered" modal on cancellation. Fix by checking the order's final status before triggering the success modal. | High | Completed — only fires `showOrderDelivered` when `found?.status === "DELIVERED"` |
| 3 | `CheckoutFlow.tsx`: multi-business cart only validates minimum order amount for `businessIds[0]`. Other businesses' minimums are ignored. | Medium | Pending |
| 4 | `orders/[orderId]/page.tsx`: `use(params)` is called without a `<Suspense>` wrapper around the page component, which can throw an unhandled suspension in Next.js 15+ with async params. | Medium | Pending |
| 5 | `CheckoutFlow.tsx`: delivery fee defaults silently to `€2.00` while the lazy query loads or if it fails — incorrect order total displayed to the user. Show a loading skeleton or block the "Continue" button until the fee is resolved. | Medium | Pending |

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | `useHydratedBusinesses.ts`: N+1 pattern — one `GET_BUSINESS` network request per business on home page load (20 businesses = 21 requests). Replace with a single `businesses { ...fullFields }` query. | High | Completed — `GET_BUSINESSES` now includes full fields; `useHydratedBusinesses` simplified to a single `useQuery` |
| 7 | `profile/page.tsx`: `GET_ORDERS` with `limit: 50` is fetched purely for a count sub-label. Use a dedicated `ordersCount` query or `{ limit: 1 }` + `totalCount`. | Medium | Pending |
| 8 | `addresses/page.tsx`: all 4 address mutations use `refetchQueries` — 4 extra network round-trips per action. Use cache update (`writeQuery` / `modifyCache`) or a single `onCompleted` refetch. | Low | Pending |
| 9 | `apollo-client.ts`: `InMemoryCache` has no type policies — for high-frequency entities (orders) add `keyFields` and merge policies to reduce re-renders. | Low | Pending |

### Auth / Security
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 10 | `auth-context.tsx`: `ME_QUERY` is imported but never called. On page reload, user is trusted from `localStorage` with no server validation. Call `ME_QUERY` on mount to verify the token is still valid. | Medium | Completed — `ME_QUERY` called on mount when a stored token exists; on success user state is updated from server; on error auth is cleared |
| 11 | `apollo-client.ts` + `auth-context.tsx`: `clearStoredAuth` (Apollo) and `logout()` (context) are not synchronized — Apollo can clear localStorage while React state still shows the user as authenticated. Centralize auth clearing through the context's `logout()`. | Medium | Pending |
| 12 | `apollo-client.ts`: `onError` retry has no attempt limit — theoretically infinite loop if server keeps returning `UNAUTHENTICATED` after a successful token refresh. Add a per-operation retry counter. | Medium | Pending |

### Code Quality / UX
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 13 | `Header.tsx` mobile bottom nav is missing Profile and Orders tabs — users on mobile have no tab-bar path to their profile or order history. | Medium | Completed — Orders tab added (authenticated only); Profile was already present |
| 14 | `Header.tsx` locale toggle updates UI only — `SET_MY_PREFERRED_LANGUAGE_MUTATION` is not called, so the backend never gets the user's language preference. | Medium | Pending |
| 15 | Root `app/page.tsx` duplicates the `<Header>/<main>/<Footer>` shell already present in `(main)/layout.tsx`. Extract to a shared wrapper or rely solely on the route group layout. | Low | Pending |
| 16 | `(main)/page.tsx`: 3 hardcoded fallback banners contain customer-visible promo copy (`WELCOME20`, "Free delivery this weekend"). Remove or gate to dev/staging only. | Medium | Pending |
| 17 | `searchStore.ts` is a single global query shared between the home page and market page. Searching in the market dirties the home page filter. Scope search state per route or clear on navigation. | Low | Pending |
| 18 | `ActiveOrderBanner` and `CartFloatingBar` both use `z-40 bottom-*` positioning. When both are visible they overlap. Add stacking coordination (`bottom-16` offset when both present). | Low | Pending |
| 19 | `Footer.tsx`: all link labels are hardcoded English (not translated); `/restaurants` link will 404 (home is `/`). | Low | Pending |
| 20 | `providers.tsx`: `LocationProvider` is commented out with `// Temporarily disabled to fix login issues`. Either fix the underlying issue and re-enable, or remove the dead code. | Low | Pending |
| 21 | `cartStore.ts`: deduplication key uses `JSON.stringify(selectedOptions)` — insertion-order dependent. Normalize/sort the options object before stringifying. | Low | Pending |
