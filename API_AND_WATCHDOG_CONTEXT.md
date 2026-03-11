# API And Watchdog Context

This file is a compact, code-grounded explanation of how the backend API and the driver watchdog work in this repository. It is intended as future context for maintenance, debugging, and prompt handoff.

## High-level architecture

The backend is a Node.js API built on:

- Express for HTTP bootstrapping and middleware
- GraphQL Yoga for the GraphQL server
- `graphql-ws` over a WebSocket server for subscriptions
- Drizzle ORM for database access
- Redis-backed pubsub bridge for cross-instance subscription fan-out when Redis is available
- Pino-style structured logging, Sentry, and an optional local observability stack

The main entrypoint is `api/src/index.ts`.

## What starts on boot

When the API starts, `api/src/index.ts` does the following:

1. Initializes Sentry first.
2. Creates the Express app.
3. Applies security and transport middleware:
   - `helmet`
   - `cors`
   - JSON body parser
   - rate limits for general API, auth, and uploads
   - request logging middleware
4. Registers REST routes:
   - `/api/upload`
   - `/api/debug` in non-production
5. Mounts GraphQL Yoga at `/graphql`.
6. Starts the HTTP server.
7. On successful listen:
   - initializes the Redis pubsub bridge
   - initializes Firebase admin if configured
   - initializes driver services, including the watchdog
8. Creates a WebSocket server on the same `/graphql` path for subscriptions.

Important shutdown behavior:

- stops driver services
- stops the pubsub Redis bridge
- closes DB pool, cache, and Sentry

## API request model

There are three main kinds of backend traffic:

### 1. Regular GraphQL queries and mutations

These go through Yoga on `/graphql`.

Examples:

- admin queries for orders, drivers, businesses
- customer order creation
- driver heartbeat mutation
- admin order status changes

### 2. GraphQL subscriptions over WebSocket

Subscriptions are handled by `graphql-ws` on the same `/graphql` path.

The WebSocket layer also has driver-specific reconnect/disconnect handling:

- when a driver socket connects, the token is decoded
- if the socket belongs to a driver, the API calls `driverService.handleReconnect(userId)`
- when that socket disconnects, the API calls `driverService.handleDisconnect(userId)`

This is important because driver connectivity is not only derived from heartbeat timestamps. Socket lifecycle also drives `DISCONNECTED` state transitions.

### 3. Small REST endpoints

These are secondary compared to GraphQL. The main custom REST route currently relevant at startup is upload handling.

## Core backend domains involved in live delivery

For the admin live map and driver tracking path, the critical pieces are:

- `api/src/index.ts`
- `api/src/services/driverServices.init.ts`
- `api/src/services/DriverService.ts`
- `api/src/services/DriverHeartbeatHandler.ts`
- `api/src/services/DriverWatchdogService.ts`
- `api/src/repositories/DriverRepository.ts`
- `api/src/lib/pubsub.ts`
- `api/src/services/OrderService.ts`

## Driver services initialization

`api/src/services/driverServices.init.ts` wires together three layers:

1. `DriverRepository`
   - low-level DB operations for driver rows and connection state
2. `DriverWatchdogService`
   - periodic and timer-based state degradation
3. `DriverService`
   - high-level orchestration for heartbeat, reconnect, disconnect, and admin actions

The watchdog is started automatically during initialization.

## Driver connection model

The backend uses four driver connection states:

- `CONNECTED`
- `STALE`
- `LOST`
- `DISCONNECTED`

Meaning:

- `CONNECTED`: driver is actively sending heartbeats
- `STALE`: no heartbeat for 45 seconds
- `LOST`: no heartbeat for 90 seconds
- `DISCONNECTED`: socket closed or session explicitly disconnected

Thresholds live in `api/src/repositories/DriverRepository.ts` as `CONNECTION_THRESHOLDS`:

- stale after 45s
- lost after 90s
- location DB write throttle every 10s
- force location write if moved more than 5m

## Heartbeat flow

The entry GraphQL mutation is `driverHeartbeat` in `api/src/models/Driver/resolvers/Mutation/driverHeartbeat.ts`.

The mobile driver app is expected to call it roughly every 5 seconds while online.

Inputs:

- `latitude`
- `longitude`
- optional `activeOrderId`
- optional `navigationPhase`
- optional `remainingEtaSeconds`

Resolver responsibilities:

1. verify the caller is authenticated
2. verify the caller has role `DRIVER`
3. validate coordinates
4. delegate to `driverService.processHeartbeat(...)`
5. return a compact result with:
   - `success`
   - `connectionStatus`
   - `locationUpdated`
   - `lastHeartbeatAt`

## What `DriverService.processHeartbeat` does

`DriverService` is the coordinator.

On each heartbeat it:

1. ensures a driver profile exists
2. delegates the main heartbeat logic to `DriverHeartbeatHandler`
3. if successful, notifies the watchdog with `trackHeartbeat(userId, lastHeartbeatAt)`

That last step is important: the watchdog is not polling blindly only. It also schedules per-driver stale/lost timers from each fresh heartbeat.

## What `DriverHeartbeatHandler` does

`api/src/services/DriverHeartbeatHandler.ts` contains the main application-level heartbeat behavior.

On each heartbeat:

1. reads the current driver record
2. creates it if missing
3. decides whether the location should be written to DB
4. always updates `lastHeartbeatAt`
5. always sets `connectionStatus` to `CONNECTED`
6. only writes `driverLat` and `driverLng` if throttle rules say it should
7. stores or clears live ETA payload in cache
8. publishes realtime updates when needed

### Location write throttling

The DB location update is not written on every heartbeat.

It writes when either:

- there is no previous location
- at least 10 seconds passed since the last location write
- the driver moved at least 5 meters

This reduces write load while still keeping the map reasonably fresh.

### Live ETA payload

If a heartbeat includes:

- `activeOrderId`
- finite `remainingEtaSeconds`

then the API stores a live ETA payload through the driver ETA cache. If not, the cache is cleared for that driver.

This lets admin and customer clients read live ETA data without recalculating everything from scratch on every screen.

### Realtime publishes from heartbeat

Heartbeat can publish two different kinds of live updates:

1. `driversUpdated`
   - published when the driver was previously disconnected/stale/lost, or when a location write is refreshed
   - this keeps admin driver lists and admin map state in sync
2. `orderDriverLiveTracking`
   - published when `activeOrderId` is present
   - this is the granular per-order live driver tracking stream

## Watchdog design

The watchdog lives in `api/src/services/DriverWatchdogService.ts`.

It has two complementary mechanisms:

### 1. Realtime per-driver timers

On every successful heartbeat, `trackHeartbeat(...)` schedules:

- a stale timer for `heartbeat + 45s`
- a lost timer for `heartbeat + 90s`

If another heartbeat arrives first, old timers are cleared and replaced.

This is the low-latency path and is the preferred behavior for timely transitions.

### 2. Periodic reconciliation pass

Every 10 seconds, the watchdog runs `checkDriverStates()`.

That periodic pass:

- marks `CONNECTED -> STALE` when heartbeat age is between 45s and 90s
- marks `CONNECTED/STALE -> LOST` when heartbeat age is greater than 90s
- clears stale/lost timers for affected users as needed
- publishes driver updates if anything changed
- logs grouped status counts

This periodic pass is the fallback safety net in case timers are missed, a process is restarted, or a timing edge case occurs.

## Disconnect and reconnect behavior

WebSocket lifecycle is part of the connection model.

### On reconnect

In `api/src/index.ts`, when a driver WebSocket connects:

- the JWT is decoded from connection params
- if the session belongs to a driver, `driverService.handleReconnect(userId)` runs

That path restores the session state and republishes driver updates.

### On disconnect

When a tracked driver WebSocket disconnects:

- `driverService.handleDisconnect(userId)` runs
- watchdog timers for that driver are cleared
- the driver is marked disconnected
- the driver list subscription is republished

This means `DISCONNECTED` is an explicit session event, while `STALE` and `LOST` are heartbeat-age degradations.

## Pubsub and realtime model

The backend pubsub layer is in `api/src/lib/pubsub.ts`.

It supports in-memory pubsub by default and can bridge across multiple instances using Redis.

Relevant topics:

- `orders.byUser.changed.<userId>`
- `orders.all.changed`
- `drivers.all.changed`
- `order.driver.live.changed.<orderId>`

Important detail:

- order update topics are usually lightweight invalidation signals, not full payload pushes
- clients subscribe, receive a signal, then refetch through normal GraphQL queries

This is implemented in `OrderService`:

- `publishUserOrders(userId)` sends an empty `orders` array as a signal
- `publishAllOrders()` sends an empty `orders` array as a signal

That design keeps subscription payloads small and shifts full hydration back to normal queries.

## How admin live map data stays fresh

For the admin panel map, freshness comes from a mix of:

1. `driversUpdated` subscription
   - used to refetch the drivers query
2. `allOrdersUpdated` subscription
   - used to refetch the orders query
3. direct driver connection and heartbeat state in driver records
4. optional per-order live tracking updates for finer customer/admin tracking flows

The admin panel is therefore mostly subscription-driven invalidation plus refetch, not full state streaming.

## Why there is both heartbeat data and watchdog logic

They solve different problems.

Heartbeat answers:

- what is the driver's latest reported location?
- are they actively online right now?
- what is the current live ETA payload?

Watchdog answers:

- when should a driver degrade from healthy to warning to offline-like states if heartbeats stop?
- how do we correct state if a timer is missed or the process restarts?

Without the watchdog, a driver could remain stuck as `CONNECTED` after the app stopped sending heartbeats.

## Observability stack

The local observability stack lives under `observability/`.

It includes:

- Loki
- Promtail
- Grafana
- Sentry integration in the API and mobile apps

The intended flow is:

1. API writes structured logs to `api/logs/`
2. Promtail reads those logs
3. Promtail pushes them to Loki
4. Grafana queries Loki and shows dashboards/alerts
5. Sentry separately captures errors and performance traces

Key use cases called out in `observability/README.md`:

- API overview metrics
- order and delivery flow monitoring
- payment/financial error monitoring
- driver watchdog activity

The stack is mainly for debugging and operational visibility. It is not part of the watchdog control path.

## Operational behavior worth remembering

### Order updates

Order mutations commonly publish two lightweight signals after a successful change:

- `publishUserOrders(userId)`
- `publishAllOrders()`

This affects order creation, status changes, preparation changes, assignment, cancellation, and test order creation.

### Driver updates

Driver list updates are pushed when:

- a heartbeat causes reconnect or a location refresh write
- the watchdog changes state to `STALE` or `LOST`
- a driver disconnects or reconnects
- admin/manual driver status changes occur

### Multi-instance behavior

If Redis pubsub is available, topic publishes are bridged across instances. If Redis is unavailable, the system falls back to in-memory pubsub, which is acceptable for single-instance dev.

## Mental model for debugging

When something looks wrong in admin driver tracking, use this checklist:

1. Did the driver send `driverHeartbeat` successfully?
2. Did the driver socket connect and stay connected?
3. Is `lastHeartbeatAt` advancing?
4. Is `connectionStatus` stuck because heartbeats stopped or because disconnect handling fired?
5. Is the issue in DB state, pubsub delivery, or only the admin refetch layer?
6. Is Redis pubsub bridge enabled, or are you in single-instance fallback mode?
7. Are live ETA fields present in cache and reflected in the driver connection payload?

## Practical summary

If you need the shortest correct mental model:

- GraphQL Yoga serves the API.
- `driverHeartbeat` is the live entrypoint from the driver app.
- `DriverHeartbeatHandler` updates heartbeat state, throttles DB writes, and publishes live updates.
- `DriverWatchdogService` degrades inactive drivers from `CONNECTED` to `STALE` to `LOST` using both timers and a 10-second reconciliation loop.
- WebSocket disconnects mark drivers `DISCONNECTED`.
- Order and driver subscriptions are mostly invalidation signals that cause clients to refetch.
- Redis pubsub is optional but used to fan out subscription events across instances.
- Observability is separate from control flow and exists to inspect logs, errors, and system health.

## Suggested future prompt usage

If you want to give future context quickly, point to this file and specify which layer you want to work in:

- API bootstrap and middleware
- GraphQL schema/resolvers
- order invalidation and subscriptions
- driver heartbeat flow
- watchdog state transitions
- admin map data freshness
- observability and logs
