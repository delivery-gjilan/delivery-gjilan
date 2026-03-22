# Driver Tracking Smoothness

<!-- MDS:O12 | Domain: Operations | Updated: 2026-03-22 -->
<!-- Depends-On: B4, B1, M8, A1 -->
<!-- Depended-By: — -->
<!-- Nav: Heartbeat cadence changes → update B4. Admin map animation changes → update this doc. Customer interpolation changes → update this doc. -->

## Purpose

Documents the end-to-end driver position pipeline from GPS acquisition through final rendering, the smoothness optimisations applied to each consumer app, and the tuning parameters available.

---

## Data Pipeline Overview

```
Driver GPS (expo-location / Nav SDK)
  │  2 s (OFD) / 5 s (idle) heartbeat
  ▼
API  DriverHeartbeatHandler
  ├── DB write: throttled (10 s OR 5 m moved)
  ├── publishDriverUpdate (subscription):
  │     • idle drivers: only when DB writes
  │     • OFD drivers: every heartbeat (2 s bypass)  ← NEW
  └── orderDriverLiveTracking (per-order sub):
        • every heartbeat when activeOrderId set
  │
  ├────────────────────────────┐
  ▼                            ▼
Admin panel (map/page.tsx)   Customer (OrderDetails.tsx)
  rAF @ 60 fps                setInterval @ 20 fps (50 ms)
  state commit @ 30 fps       ease-out cubic tween
  dead-reckoning              dead-reckoning extrapolation
  route-snap                  EMA interval adaptation
```

---

## Admin Panel (`admin-panel/src/app/dashboard/map/page.tsx`)

### Animation Loop

The admin map uses `requestAnimationFrame` for driver marker animation.

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `ANIMATION_COMMIT_INTERVAL_MS` | 33 ms (~30 fps) | React state commit rate (was 66 ms / 15 fps) |
| rAF callback rate | ~60 fps | Dead-reckoning math runs every frame |

Between subscription updates the loop linearly dead-reckons each driver's position using heading and speed derived from the last two known points.

### Route-Snap

When a driver is OUT_FOR_DELIVERY and the admin has fetched route geometry for the order:

1. The rAF loop reads the route `[lon, lat][]` polyline for the driver's active order.
2. `snapToRoute()` projects the dead-reckoned position onto the nearest segment using planar projection.
3. If the perpendicular distance is ≤ `ROUTE_SNAP_MAX_DISTANCE_M` (50 m), the snapped point replaces the raw dead-reckoned position.
4. If > 50 m (e.g. driver has deviated), the raw position is used unmodified.

This eliminates jitter where dead-reckoning overshoots corners or GPS noise pushes the marker off-road.

**Implementation detail:** `snapToRoute()` uses a planar approximation (multiplying Δlon by cos(lat) for local metre conversion). This is accurate enough at delivery-scale distances (< 50 km).

### Feed Rate

Previously the admin received position updates only when the DB throttle gate passed (10 s elapsed OR 5 m moved). For a slow-moving or stationary OFD driver this meant up to 10 s gaps.

The API now bypasses the publish throttle for active deliveries (`!!etaPayload?.activeOrderId`), delivering 2 s position updates to the admin subscription. Combined with the 30 fps commit rate and dead-reckoning, the resulting marker movement is smooth and responsive.

---

## Mobile Customer (`mobile-customer/modules/orders/components/OrderDetails.tsx`)

### Subscription Feed

`orderDriverLiveTracking` pushes every heartbeat (2 s during OFD) with `{ latitude, longitude, navigationPhase, remainingEtaSeconds }`.

### Interpolation

A `setInterval(50)` (20 fps) loop animates the driver marker between subscription updates.

**Phase 1 — Ease-out cubic tween:**
- Duration is estimated via EMA of observed heartbeat intervals (α = 0.35, was 0.2).
- Tween applies `1 - (1-t)³` easing from previous position to new target.
- While `progress < 1`, position is interpolated along the tween curve.

**Phase 2 — Dead-reckoning extrapolation:**
- When `progress ≥ 1` (tween complete), the loop enters dead-reckoning.
- Average tween velocity (`Δlat/ms`, `Δlng/ms`) is captured at tween completion.
- Position is extrapolated using that velocity with exponential decay: `e^(-age / DRIVER_DEAD_RECKONING_DECAY_MS)`.
- Hard cap at `DRIVER_DEAD_RECKONING_MAX_MS` (4 s) — after which the marker holds its last position until the next heartbeat arrives.

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Interval | 50 ms (20 fps) | Animation tick rate |
| EMA α | 0.35 | Heartbeat interval adaptation speed |
| `DRIVER_DEAD_RECKONING_MAX_MS` | 4 000 ms | Maximum extrapolation window |
| `DRIVER_DEAD_RECKONING_DECAY_MS` | 2 500 ms | Velocity decay half-life |

### Why EMA α = 0.35

At 0.2 the tween duration adapted slowly (~5 heartbeats to converge after a cadence change). At 0.35 it converges in ~3, which matters when the driver transitions between 5 s idle and 2 s OFD cadence. Going higher risks overshoot on a single jittery interval.

---

## Mobile Driver

The driver's own map renders its position using:
- 60 fps `requestAnimationFrame` loop with GPS dead-reckoning (`usePredictedTracking`-style logic in the nav screen)
- Mapbox Navigation SDK map-matching (when navigating)
- EMA-smoothed heading from `useDriverLocation`

No smoothness changes were made to the driver app in this round — it already has the best of the three because it uses the raw GPS feed at full cadence with native SDK rendering.

---

## Tuning Guide

| Symptom | Knob | Where |
|---------|------|-------|
| Admin markers jitter at corners | Increase `ROUTE_SNAP_MAX_DISTANCE_M` | `page.tsx` constant |
| Admin markers feel laggy | Decrease `ANIMATION_COMMIT_INTERVAL_MS` (e.g. 16 ms = 60 fps commits) | `page.tsx` constant |
| Customer marker stops between heartbeats | Increase `DRIVER_DEAD_RECKONING_MAX_MS` (risk: overshoot) | `OrderDetails.tsx` constant |
| Customer marker overshoots then snaps back | Decrease `DRIVER_DEAD_RECKONING_DECAY_MS` | `OrderDetails.tsx` constant |
| Tween duration adapts too slowly after cadence change | Increase EMA α (max ~0.5) | `OrderDetails.tsx` inline |
| Admin map gets stale for idle drivers | Remove `isActiveDelivery` guard in publish condition | `DriverHeartbeatHandler.ts` (caution: increases subscription traffic) |
