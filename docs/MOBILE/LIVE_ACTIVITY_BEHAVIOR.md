# Live Activity Behavior (Customer iOS)

<!-- MDS:M3 | Domain: Mobile | Updated: 2026-03-22 -->
<!-- Depends-On: M2, B4 -->
<!-- Depended-By: O4 -->
<!-- Nav: ETA/progress changes → update B4 (Watchdog heartbeat). Token lifecycle → update O4 (Push Audit). Status mapping → review B2 (Order Creation). -->

This document describes the implemented Live Activity flow for customer order tracking, including background updates, Dynamic Island UI constraints, and ETA-progress behavior.

## Goals Implemented

- Status transitions update the same active Live Activity instead of spawning one per status.
- Dynamic Island compact layout is optimized for default (compact) island presentation.
- Progress bar is dynamic and reflects remaining ETA over time.
- Background updates are delivered via APNs Live Activity push updates.
- Preparing and out-for-delivery phases both support progress semantics.

## Architecture

### Client (mobile-customer)

- Hook: `mobile-customer/hooks/useLiveActivity.ts`
- Native module + widget extension templates (generated during prebuild):
  - `mobile-customer/plugins/with-live-activity-extension.js`

### Backend (api)

- Live Activity payload sender:
  - `api/src/services/NotificationService.ts`
- Live Activity helper wrappers:
  - `api/src/services/orderNotifications.ts`
- Status-driven updates:
  - `api/src/models/Order/resolvers/Mutation/startPreparing.ts`
  - `api/src/models/Order/resolvers/Mutation/updateOrderStatus.ts`
  - `api/src/models/Order/resolvers/Mutation/updatePreparationTime.ts`
- Heartbeat-driven ETA updates (out for delivery):
  - `api/src/services/DriverHeartbeatHandler.ts` (periodic 90 s throttled pushes)
  - `api/src/models/Driver/resolvers/Mutation/driverHeartbeat.ts`

## Single Activity Per Order

To prevent duplicate Live Activities for the same order:

- Native module `startActivity` now checks existing `Activity<DeliveryActivityAttributes>.activities` for matching `orderId` and reuses the existing activity ID.
- Native module adds `findActivityByOrderId(orderId)`.
- JS hook calls `findActivityByOrderId` before starting a new activity and binds to existing activity if present.

This keeps one active activity per order/session and updates it dynamically as state changes.

## Live Activity Content State

### Fields

State now carries:

- `driverName: String`
- `estimatedMinutes: Int`
- `phaseInitialMinutes: Int`
- `phaseStartedAt: Int64` (unix ms)
- `status: String`
- `orderId: String`
- `lastUpdated: Int64` (unix ms)

### Why `phaseInitialMinutes` + `phaseStartedAt`

These fields allow the widget to infer remaining time continuously, even between pushes, so the progress bar and ETA can advance naturally.

Example:

- phase starts at 10 minutes (`phaseInitialMinutes = 10`)
- elapsed is 5 minutes
- inferred remaining is 5 minutes
- progress shown is 50%

## Dynamic Progress Calculation

Widget computes progress from:

- total phase minutes (`phaseInitialMinutes`)
- phase start timestamp (`phaseStartedAt`)
- current wall clock (`Date()`)
- current server estimate (`estimatedMinutes`), clamped to inferred range

Conceptually:

- elapsed minutes: time since `phaseStartedAt`
- inferred remaining: `phaseInitialMinutes - elapsed`
- current remaining: min(server estimate, inferred remaining)
- progress: `(phaseInitialMinutes - currentRemaining) / phaseInitialMinutes`

This supports the expected behavior:

- 10 -> 5 minutes remaining => 50% progress.

## Dynamic Island UI Refactor

Widget template now defines Dynamic Island regions with compact-first behavior:

- `compactLeading`: shipping icon
- `compactTrailing`: ETA text (`~Xm`)
- `minimal`: shipping icon
- expanded regions include status + ETA + linear progress

Lock Screen presentation includes:

- business name + ETA header
- status subtitle
- linear progress bar
- order ID + driver name row

This layout is intentionally concise for default compact island constraints.

## Background Update Behavior

Once token registration exists for that activity/order:

- Backend sends APNs `liveactivity` updates (`event: update`) to existing activity tokens.
- No foreground app state is required for updates to apply.
- Out-for-delivery ETA refreshes are sent from driver heartbeat flow.

### Heartbeat Update Throttling

`DriverHeartbeatHandler.processHeartbeat()` pushes periodic Live Activity ETA updates during the `to_dropoff` navigation phase. Two throttle layers prevent excessive pushes:

1. **Heartbeat gate:** Redis key `cache:la-heartbeat:{orderId}` with **90 s** TTL. Checked before any work.
2. **NotificationService gate:** `sendLiveActivityUpdate` enforces a minimum interval of `LIVE_ACTIVITY_MIN_UPDATE_INTERVAL_SECONDS` (default 15 s) and a minimum ETA delta of `LIVE_ACTIVITY_MIN_ETA_DELTA_MINUTES` (default 1 min). Status changes always pass immediately.

The combined effect is ~2–5 mid-delivery pushes for a 5–15 min delivery, refining the Dynamic Island countdown as the motorcycle driver's actual pace diverges from the initial estimate.

The push is fire-and-forget and never blocks the heartbeat response path.

## Status Mapping and Phase Baselines

### PREPARING

- `status: preparing`
- `estimatedMinutes: preparationMinutes`
- `phaseInitialMinutes: preparationMinutes`
- `phaseStartedAt: preparingAt`

Also refreshed when preparation time is edited.

### READY

- `status: ready`
- uses current estimated defaults from status mutation path
- phase fields still supplied for consistency

### OUT_FOR_DELIVERY

- `status: out_for_delivery`
- status mutation sends initial phase baseline
- heartbeat updates refine ETA over time
- heartbeat computes `phaseInitialMinutes` from elapsed + remaining to maintain stable progress semantics

### End States

- `DELIVERED` and `CANCELLED` trigger Live Activity end event (`event: end`) when routed through `updateOrderStatus` mutation.
- Client-side safety net: `OrderDetails.tsx` watches `isCompleted || isCancelled` and calls `endActivity()` natively as a fallback.

#### Known Gap: `cancelOrder` Mutation

- The `cancelOrder` mutation (used when the customer cancels from the app) sends an FCM cancellation notification but does **not** call `endLiveActivity()`.
- The Live Activity persists on the Dynamic Island / Lock Screen until the iOS system timeout or the client-side safety net catches it.
- Fix: add `endLiveActivity(context.notificationService, id, 'cancelled')` to `api/src/models/Order/resolvers/Mutation/cancelOrder.ts` after the order is cancelled.

## APNs Payload Contract

Backend now includes phase metadata in both `data` and `aps.content-state`:

- `phaseInitialMinutes`
- `phaseStartedAt`

alongside existing:

- `driverName`, `estimatedMinutes`, `status`, `orderId`, `lastUpdated`

## Files Changed

- `api/src/services/NotificationService.ts`
- `api/src/services/orderNotifications.ts`
- `api/src/models/Order/resolvers/Mutation/startPreparing.ts`
- `api/src/models/Order/resolvers/Mutation/updateOrderStatus.ts`
- `api/src/models/Order/resolvers/Mutation/updatePreparationTime.ts`
- `api/src/services/DriverHeartbeatHandler.ts`
- `api/src/models/Driver/resolvers/Mutation/driverHeartbeat.ts`
- `mobile-customer/hooks/useLiveActivity.ts`
- `mobile-customer/modules/orders/components/OrderDetails.tsx`
- `mobile-customer/plugins/with-live-activity-extension.js`

## Validation Checklist (Real Device)

1. Start preparing on an order with 10-minute prep.
2. Confirm one Live Activity appears.
3. Wait 5 minutes and confirm progress is around 50%.
4. Move order to out-for-delivery.
5. Confirm same activity updates status (no duplicate activity).
6. Send driver heartbeats with decreasing ETA and confirm progress advances.
7. Put app in background and confirm island/lock-screen updates still arrive.
8. Mark delivered and confirm activity ends.

## Operational Notes

- Live Activity extension artifacts are generated by Expo config plugin during iOS prebuild.
- On Windows, iOS artifacts cannot be built locally; verify on macOS CI/runner or local macOS machine.
- Keep APNs topic aligned with extension bundle identifier (`LIVE_ACTIVITY_APNS_TOPIC` / `IOS_EXTENSION_BUNDLE_ID`).

## Rollback Snapshot (Pre-2026-03-20)

Use this section to quickly revert to the previous client behavior if the realtime sync rollout causes regressions.

### Previous Behavior

- Live Activity start/update on client was mainly lifecycle-driven.
- Primary trigger was app transition from foreground to background/inactive.
- There was no dedicated realtime sync pass on every active-order store change.
- Firebase Messaging handling did not include `messaging().onMessage(...)` for foreground or `setBackgroundMessageHandler(...)` for background.

### Current Behavior (Post-2026-03-20)

- Client syncs Live Activity from active-order state changes (status/ETA/phase) using a signature gate.
- Foreground/background lifecycle trigger is still kept as safety path.
- Firebase Messaging now listens in both foreground and background.

### Fast Revert Steps

1. Revert realtime sync additions in `mobile-customer/hooks/useBackgroundLiveActivity.ts`:
  - remove `lastSyncedSignatureRef`
  - remove `syncLiveActivity(...)`
  - restore background-transition-only start flow
  - remove the realtime `useEffect` that calls `syncLiveActivity()`
2. Revert Firebase foreground listener in `mobile-customer/hooks/useNotifications.ts`:
  - remove `const unsubscribeOnMessage = messaging().onMessage(...)`
  - remove `unsubscribeOnMessage()` from cleanup
3. Revert Firebase background handler in `mobile-customer/index.tsx`:
  - remove `messaging().setBackgroundMessageHandler(...)` registration block
4. Run `npm run typecheck` inside `mobile-customer`.

### Files To Touch For Revert

- `mobile-customer/hooks/useBackgroundLiveActivity.ts`
- `mobile-customer/hooks/useNotifications.ts`
- `mobile-customer/index.tsx`
