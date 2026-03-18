# Architecture

<!-- MDS:A1 | Domain: System | Updated: 2026-03-18 -->
<!-- Depends-On: (none — root document) -->
<!-- Depended-By: B1, B4, M1, O1, O2 -->
<!-- Nav: Changes here affect all domain docs. Review B1 (API), B4 (Watchdog), M1 (Mobile Overview). -->

## Monorepo Shape

The workspace is organized around one backend and multiple clients:

- `api` is the system of record for auth, orders, pricing, settlements, notifications, and realtime delivery state
- `admin-panel` is the main operations dashboard
- `mobile-customer` handles browsing, checkout, order history, and delivery tracking
- `mobile-driver` handles driver online state, heartbeat, navigation, and delivery execution
- `mobile-business` handles order preparation and business-side workflows
- `mobile-admin` is a mobile-first admin companion
- `observability` contains the optional local logging and dashboard stack

## Runtime Topology

```text
mobile apps / admin-panel
        |
        | HTTP GraphQL + websocket subscriptions
        v
       api
        |
        | Drizzle
        v
   Postgres database

api also integrates with:
- Redis pubsub when enabled for cross-instance subscription fan-out
- Firebase / push infrastructure for notifications
- Loki / Grafana / Promtail in local observability mode
```

## Backend Layers

At a high level the backend is split into:

- `models` for GraphQL schema files and resolver entrypoints
- `services` for orchestration and domain behavior
- `repositories` for persistence and query-level logic
- `lib` for shared utilities like pubsub, logger, auth helpers, and cache helpers
- `generated` for schema/types/resolver glue from codegen

The critical path for live delivery behavior goes through:

- `api/src/index.ts`
- `api/src/services/driverServices.init.ts`
- `api/src/services/DriverService.ts`
- `api/src/services/DriverHeartbeatHandler.ts`
- `api/src/services/DriverWatchdogService.ts`
- `api/src/repositories/DriverRepository.ts`

## Client Responsibilities

The clients are intentionally not symmetrical.

- `mobile-customer` consumes live order and driver state, but only for the current user's orders
- `mobile-driver` is the producer of heartbeat, battery, and navigation ETA data
- `mobile-business` is closer to an operations queue than a map-heavy realtime client
- `admin-panel` is the broadest consumer of admin-only data and uses subscriptions mostly as invalidation signals followed by refetch

## Realtime Model

The system does not stream the entire world state continuously. Most subscriptions are signals that something changed.

- `userOrdersUpdated` notifies the customer side that order state changed
- `allOrdersUpdated` notifies admin and business views to refetch lists
- `driversUpdated` notifies the admin side that driver presence or location-relevant fields changed
- `orderDriverLiveTracking` is the narrower per-order delivery tracking stream
- `storeStatusUpdated` broadcasts store open/closed and banner changes

## Current Architectural Pressure Points

- settlement and pricing features are mid-refactor and not yet explained cleanly in one place
- several generated GraphQL clients exist across apps, which makes cross-package schema churn expensive
- mobile apps share concepts but not a formal shared package, so patterns must be documented well
- heartbeat and watchdog behavior is core to delivery correctness and needs to stay code-grounded