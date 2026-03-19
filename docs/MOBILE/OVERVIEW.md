# Mobile Overview

<!-- MDS:M1 | Domain: Mobile | Updated: 2026-03-19 -->
<!-- Depends-On: A1 -->
<!-- Depended-By: M2, M3, M4, M5, BL2, BL3 -->
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

Bottom tab UX now includes an active-tab underline tile using theme primary purple for clearer current-tab state.

`mobile-business` finances now supports business-focused settlement review with filters (period, status, direction, order search) plus per-settlement order item breakdown and commission/net reasoning.

Recent backend-driven store status changes are now exposed through subscription updates, which means banner and store availability UI can react faster.

## Driver App Notes

`mobile-driver` is operationally sensitive because it produces delivery truth for the rest of the system.

Key responsibilities:

- send heartbeat frequently while authenticated
- attach live ETA and navigation phase when actively delivering
- keep background behavior good enough for presence correctness
- update battery telemetry

Any regression here affects admin maps and customer delivery tracking.

## Business And Admin Mobile Notes

`mobile-business` and `mobile-admin` are closer to operational dashboards than consumer apps.

- they care more about list freshness and order state changes
- they can usually refetch safely on signals instead of animating fine-grained movement
- they are good candidates for further cleanup because parts of their docs and behaviors are still under-documented

## Main Documentation Gap

The apps share patterns but not enough explicit documentation. When changing auth, websocket, or generated GraphQL behavior, verify all four apps because schema changes propagate widely.