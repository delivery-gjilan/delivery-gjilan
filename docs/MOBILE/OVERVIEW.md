# Mobile Overview

<!-- MDS:M1 | Domain: Mobile | Updated: 2026-03-24 -->
<!-- Depends-On: A1 -->
<!-- Depended-By: M2, M3, M4, M5, M8, BL2, BL3 -->
<!-- Nav: App-level architecture changes → update all M* files. Shared pattern changes → review BL2 (Products), BL3 (Cart). -->

## Apps

This repo contains four React Native / Expo apps with different responsibilities.

- `mobile-customer` - browse businesses, manage cart, place orders, view order history, track deliveries
- `mobile-driver` - manage online state, navigation, heartbeat, battery telemetry, delivery execution
- `mobile-business` - review incoming orders and move them through preparation/fulfillment flows
- `mobile-admin` - mobile admin tooling, including order and map views

## Shared Patterns

The apps are separate packages, but they share a set of conventions:

- Apollo GraphQL clients with generated documents and types
- Expo / React Native app structure
- app-local stores and hooks rather than one shared mobile package
- realtime behavior implemented selectively rather than everywhere

## Directions API Usage (Customer + Driver)

- `mobile-customer`, `mobile-driver`, `mobile-admin`, and admin-panel fetch route geometry through the backend proxy endpoint `GET /api/directions` for delivery tracking/navigation/admin route calculations.
- The proxy in `api/src/routes/directionsRoutes.ts` calls Mapbox server-side and caches results in Redis for 65 seconds using a normalized coordinate cache key (5 decimals) plus `steps` and `language` flags.
- The backend directions proxy deduplicates concurrent cache-miss requests for the same route key, so parallel callers share one upstream Mapbox request.
- Each app also has local in-memory route caches with in-flight request deduplication:
	- `mobile-customer/utils/route.ts`: 10-minute TTL, key rounded to 4 decimals.
	- `mobile-driver/utils/mapbox.ts`: 10-minute simple-route TTL and 5-minute navigation-step TTL, with max 50 entries per cache.
- Cross-app route reuse is backend-mediated (through the shared Redis cache), not direct app-to-app sharing.
- The admin map tab has been removed from `mobile-customer`; admin map flows live in `mobile-admin` and admin-panel.

## Where Realtime Matters Most

- `mobile-customer` consumes order updates and live driver tracking for active orders
- `mobile-driver` produces heartbeat and navigation ETA data
- `mobile-business` mostly uses order update signals to keep queues fresh
- `mobile-admin` uses subscriptions to keep live operations screens current without relying only on polling

## Customer App Notes

`mobile-customer` is the most UX-heavy client. Important domains include:

- business browsing and list/detail flows
- cart and checkout
- address management
- order history and active order tracking
- store-status banner and store-closed handling

In `mobile-customer` business detail, the bottom cart action panel (item count + total + "View Cart") is shown whenever the current business has cart items, while the promotion progression bar in that panel appears only when a spend-threshold promotion is available for that business.

Bottom tab UX uses a stronger active state with dynamic icon fill and an animated underline marker aligned to the customer theme primary color.

Customer checkout/cart UI now uses a three-step flow shell (cart, address, review) with localized step labels and notifier/error copy so both supported languages render the same flow language. Step 3 review shows a payment method card (cash on delivery), total in the confirm button, and character counter on driver notes. Duplicate translation keys cleaned up.

Active-order floating and order-history surfaces in mobile-customer now use localized status and CTA copy consistently, including multi-active-order guidance and unified status badge wording across list and floating entry points.

After an order transitions to DELIVERED, mobile-customer queues a post-delivery review prompt after the delivery success modal closes. The review prompt supports a star rating, optional private comment, quick feedback chips (for example "The food was perfect"), one-time-per-order behavior, and persistent opt-outs for either a specific business or all future review prompts.

The post-delivery review prompt in mobile-customer uses localized text through the app translation dictionaries (EN/AL), including submit/loading states and skip/mute actions.

For order creation in mobile-customer, the success modal now auto-dismisses shortly after the success animation/confetti and routes to home before the modal closes. The order-created modal dismisses without fade so destination Home UI elements do not briefly appear underneath during transition. After redirect, the active-order floating banner can render immediately while cart-bar suppression cooldown still applies.

OrderDetails screen in mobile-customer now uses localized strings for all user-visible copy: order number label, price summary heading, delivery address heading, order items heading, show/hide summary toggle, map unavailable fallback, unknown date fallback, and cancelled status banner. Removed all `as any` translation key workarounds by adding proper schema keys.

OrderDetails in mobile-customer shows a dedicated cancellation notice in the active-order panel that instructs customers to call a phone number for cancellation, and the UX treats phone call as the only cancellation path presented in that screen.

OrderDetails driver contact in mobile-customer shows the assigned driver's actual phone number when available, and no longer falls back to a hardcoded placeholder number in the customer-facing UI.

`mobile-business` finances now supports business-focused settlement review with filters (period, status, direction, order search) and table-style settlement rows.

`mobile-business` orders now include a private customer-reviews surface that reads from `businessOrderReviews`, showing recent star ratings, quick feedback tags, and customer comments for business-side follow-up.

Settlement semantics in mobile-business are aligned to web UI2 formulas:

- `RECEIVABLE`: settlement amount is platform commission; business net is `gross - commission`.
- `PAYABLE`: settlement amount is business payout (net); commission is `gross - net`.

Recent backend-driven store status changes are now exposed through subscription updates, which means banner and store availability UI can react faster.

`mobile-customer` Live Activities (Dynamic Island / Lock Screen) now synchronize in real-time from active-order state updates (status/ETA/phase transitions) instead of only starting on app background transitions, and Firebase Messaging listeners are wired for both foreground (`onMessage`) and background (`setBackgroundMessageHandler`) event intake.

## Driver App Notes

`mobile-driver` is operationally sensitive because it produces delivery truth for the rest of the system.

Key responsibilities:

- send heartbeat frequently while authenticated
- attach live ETA and navigation phase when actively delivering
- keep background behavior good enough for presence correctness
- update battery telemetry

Any regression here affects admin maps and customer delivery tracking.

For a full deep-dive see [MOBILE/DRIVER_APP.md](DRIVER_APP.md) (M8): startup sequence, auth+token-refresh flow, Apollo client config, heartbeat/battery/PTT/notifications lifecycle, map+navigation screen logic, all GraphQL ops, Zustand stores, hooks inventory, and a comprehensive list of refactor candidates.

## Business And Admin Mobile Notes

`mobile-business` and `mobile-admin` are closer to operational dashboards than consumer apps.

- they care more about list freshness and order state changes
- they can usually refetch safely on signals instead of animating fine-grained movement
- they are good candidates for further cleanup because parts of their docs and behaviors are still under-documented

Recent mobile-business RBAC alignment updates:

- login now requests user `permissions` so employee capability checks can be enforced client-side
- tab visibility is permission-aware (`manage_products`, `manage_settings`, `view_analytics`) with owner override
- products and settings screens now include explicit access guards for restricted employees
- API/WS URL normalization strips accidental `/graphql` suffix duplication to prevent `/graphql/graphql` endpoint mistakes that can surface as login/network failures (including 404 in some tunnel setups)

## Main Documentation Gap

The apps share patterns but not enough explicit documentation. When changing auth, websocket, or generated GraphQL behavior, verify all four apps because schema changes propagate widely.

Shared auth-client behavior now assumes login-style operations must bypass token refresh in the Apollo auth link, and JWT expiry parsing should use `Buffer.from(..., 'base64')` rather than `atob()` to avoid cold-start/runtime inconsistencies on React Native.