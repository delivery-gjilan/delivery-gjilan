# Watchdog And Heartbeat

<!-- MDS:B4 | Domain: Backend | Updated: 2026-03-22 -->
<!-- Depends-On: A1, B1 -->
<!-- Depended-By: M3, O1 -->
<!-- Nav: Timer/state changes → update M3 (Live Activity). Metrics changes → update O1 (Monitoring). -->

## Why This System Exists

The driver app is the live producer of delivery presence and movement state. The backend must answer two different questions:

- what is the driver's latest reported state right now
- what should happen if those reports stop arriving

Heartbeat answers the first question. Watchdog answers the second.

## Heartbeat Flow

The driver app calls the `driverHeartbeat` mutation regularly while online.

Payload can include:

- latitude
- longitude
- active order id
- navigation phase
- remaining ETA seconds

The main backend path is:

1. resolver validates caller and coordinates
2. `DriverService.processHeartbeat(...)` coordinates the flow
3. `DriverHeartbeatHandler` updates driver state and publishes events
4. `DriverWatchdogService.trackHeartbeat(...)` schedules stale/lost timers

## What `DriverHeartbeatHandler` Does

`api/src/services/DriverHeartbeatHandler.ts` is the core application-level handler.

On each successful heartbeat it:

- ensures the driver record exists
- updates `lastHeartbeatAt`
- forces `connectionStatus` back to `CONNECTED`
- throttles DB location writes instead of writing every ping
- stores or clears live ETA cache data
- publishes realtime events when relevant
- pushes periodic Live Activity ETA updates during `to_dropoff` phase (see below)

The write-throttling behavior is important because it reduces DB churn while keeping maps fresh enough.

### Publish Throttle vs Active-Delivery Bypass

The `publishDriverUpdate` call that notifies admin/driver-list subscribers follows a two-tier policy:

- **Idle / slow drivers:** publish fires only when the DB location write passes the throttle gate (10 s elapsed OR 5 m moved), so admin maps may lag up to 10 s between updates.
- **Active deliveries (OUT_FOR_DELIVERY):** publish fires on **every heartbeat** (every 2 s) regardless of the DB throttle gate. This is gated by `!!etaPayload?.activeOrderId`. The DB write throttle still applies — only the subscription publish is bypassed — so there is no extra DB load.

This means the admin map receives 2 s position updates for any driver currently delivering, which feeds the admin-side animation loop (30 fps commit with rAF dead-reckoning and route-snap).

### Periodic Live Activity ETA Pushes

When the heartbeat includes `navigationPhase === 'to_dropoff'` and a valid `remainingEtaSeconds`, the handler fires a throttled Live Activity update to the customer's Dynamic Island.

- **Heartbeat-level gate:** Redis key `cache:la-heartbeat:{orderId}` with 90 s TTL. Only one push per 90 s per order.
- **NotificationService gate (second layer):** `sendLiveActivityUpdate` has its own 15 s interval / 1-minute ETA-delta gate.
- **Net effect:** ~2–5 mid-delivery ETA updates for a typical 5–15 min motorcycle delivery.
- **Fire-and-forget:** the push is fully async and never blocks the heartbeat response.
- **Driver name:** resolved via `authRepository.findDriversByIds` on each push (falls back to "Your driver").

This replaces the earlier minute-step-change approach and provides more reliable mid-delivery ETA refinement since motorcycle drivers often arrive faster than initially estimated.

## Watchdog Model

`api/src/services/DriverWatchdogService.ts` combines two mechanisms.

### Realtime timers

Each new heartbeat schedules per-driver timers.

- `CONNECTED -> STALE` after 45 seconds without a fresh heartbeat
- `CONNECTED/STALE -> LOST` after 90 seconds without a fresh heartbeat

### Periodic reconciliation

Every 10 seconds the watchdog runs a fallback sweep so the system recovers even if:

- the process restarts
- a timer is missed
- a race or edge case leaves a driver in the wrong state

## Connection States

- `CONNECTED` - heartbeats are arriving normally
- `STALE` - warning state, last heartbeat is too old
- `LOST` - driver appears offline from the system's perspective
- `DISCONNECTED` - websocket session closed or driver not actively connected

## Realtime Consumers

The watchdog and heartbeat publish into subscriptions that downstream clients use differently.

- admin clients mainly use driver/order subscriptions as refetch signals
- customer tracking relies on per-order live driver tracking for finer-grained delivery movement
- driver-side behavior is mostly write-oriented and does not consume this same stream heavily

## Known Reliability Risks

The main risk areas remain:

- iOS/background timer reliability
- heartbeat gaps when location acquisition stalls
- background token refresh edge cases
- missing retry behavior during poor connectivity

## Current Mental Model For Debugging

If a driver looks wrong on the map, debug in this order:

1. did the driver app send a heartbeat
2. did the backend update `lastHeartbeatAt`
3. did `DriverHeartbeatHandler` publish the expected event
4. did the watchdog move the driver into the expected state window
5. did the client refetch or receive the targeted tracking payload

If a driver remains stuck as connected after silence, the watchdog path is where to look first.