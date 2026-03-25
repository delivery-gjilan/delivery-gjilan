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

Bottom tab UX uses a stronger active state with dynamic icon fill and an animated underline marker aligned to the customer theme primary color.

Customer checkout/cart UI now uses a three-step flow shell (cart, address, review) with localized step labels and notifier/error copy so both supported languages render the same flow language. Step 3 review shows a payment method card (cash on delivery), total in the confirm button, and character counter on driver notes. Duplicate translation keys cleaned up.

Active-order floating and order-history surfaces in mobile-customer now use localized status and CTA copy consistently, including multi-active-order guidance and unified status badge wording across list and floating entry points.

OrderDetails screen in mobile-customer now uses localized strings for all user-visible copy: order number label, price summary heading, delivery address heading, order items heading, show/hide summary toggle, map unavailable fallback, unknown date fallback, and cancelled status banner. Removed all `as any` translation key workarounds by adding proper schema keys.

`mobile-business` finances now supports business-focused settlement review with filters (period, status, direction, order search) and table-style settlement rows.

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