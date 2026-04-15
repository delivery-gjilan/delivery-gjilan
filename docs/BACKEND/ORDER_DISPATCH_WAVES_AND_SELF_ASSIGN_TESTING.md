# Order Dispatch Waves And Self-Assign Testing

<!-- MDS:B12 | Domain: Backend | Updated: 2026-04-15 -->
<!-- Depends-On: B2, B4, B8, M8, O8 -->
<!-- Depended-By: M8, O8 -->
<!-- Nav: Dispatch algorithm changes -> update this file and M8. Assignment permission changes -> update this file and B2. -->

This page documents the current wave dispatch behavior and a practical testing strategy for first-wave, second-wave, and self-assign flows.

## Why The Wave Model Exists

Dispatch waves balance speed and noise:

1. Fast pickup with minimal push spam:
   - Wave 1 targets the nearest connected drivers first.
2. Reliability when wave 1 is ignored:
   - Wave 2 expands to remaining eligible drivers after a short accept window.
3. Fairness and operational control:
   - Shift restrictions and online preference are respected.
4. Driver UX clarity:
   - In dispatch mode, self-assign order lists are hidden in driver UI and assignment is expected to come from operations.

## Current Behavior (Backend)

### Core files

- `api/src/services/OrderDispatchService.ts`
- `api/src/models/Order/resolvers/Mutation/assignDriverToOrder.ts`
- `api/src/services/order/OrderLifecycleModule.ts`
- `api/src/services/orderNotifications.ts`

### Wave 1

1. Pickup coordinates are loaded from the first business in the order.
2. Eligible drivers are filtered by:
   - `onlinePreference = true`
   - optional shift restriction (`admin:shift:driverIds` cache)
3. Drivers split into:
   - connected with coordinates (distance-ranked)
   - push-only (not connected)
4. First-wave connected selection:
   - all within `FIRST_WAVE_RADIUS_KM` (3 km), otherwise
   - at least `FIRST_WAVE_MIN_DRIVERS` (2 closest)
5. Push-only drivers are included in wave 1.
6. Notification sent with `notifyDriversOrderReady`.

### Wave 2

1. Timer starts for `ACCEPT_WINDOW_MS` (60s).
2. If order dispatch state is still active and unexpanded:
   - notify all remaining eligible drivers not in first wave.
3. Notification sent with `notifyDriversOrderExpanded`.

### Gas-priority branch (far orders)

For far orders, first-wave connected drivers are split into:

1. gas/null vehicle drivers first (+ push-only)
2. electric drivers after `gasPriorityWindowSeconds`

Wave 2 can still run after the normal accept window.

### Self-assign behavior

`assignDriverToOrder` allows driver self-assign with strict guards:

1. Driver role can only assign self.
2. Driver can assign only when order status is `READY` or `PREPARING`.
3. Atomic assignment is used for driver-initiated assignment.
4. Driver max-active-orders limit is enforced.
5. On successful driver assignment, `cancelDispatch(orderId)` is called so delayed expansions do not continue.

## Test Strategy

Use three layers:

1. Service-level unit tests (highest value):
   - `OrderDispatchService` with mocked repository/cache/notification functions.
2. Resolver-level unit tests:
   - `assignDriverToOrder` role/guard behavior.
3. Optional integration test:
   - READY transition -> dispatch trigger -> assignment cancels expansion path.

## First-Wave Test Cases

### Selection and eligibility

1. Includes all connected drivers within radius.
2. Enforces minimum first-wave count when radius has too few drivers.
3. Includes push-only drivers in first wave.
4. Applies shift restriction when valid shift IDs exist.
5. Ignores stale shift IDs if they do not overlap active drivers.

### Fallback behavior

1. Missing pickup coordinates falls back to notify-all eligible drivers.
2. No eligible drivers results in no notification calls.

### Gas-priority branch

1. Far order sends first notification to gas/null + push-only only.
2. Electric first-wave drivers are notified after gas priority window.
3. Gas-mixed expansion is skipped if state already cleared.

## Second-Wave Test Cases

1. Expansion timer fires after `ACCEPT_WINDOW_MS`.
2. Wave 2 notifies only drivers not in `firstWaveIds`.
3. Expansion marks state as `expanded: true`.
4. If all connected were already in wave 1, no wave 2 timer is scheduled.
5. If dispatch state missing (order accepted/cancelled), expansion is skipped.

## Self-Assign Mode Test Cases

### Backend mutation tests

1. Driver can self-assign own ID on `READY`.
2. Driver can self-assign own ID on `PREPARING`.
3. Driver cannot assign another driver ID.
4. Driver cannot assign when order status is not `READY`/`PREPARING`.
5. Conflict when order already assigned to different driver.
6. Max active orders guard blocks assignment at limit.
7. Successful driver assignment calls dispatch cancellation.
8. Super admin can reassign and previous-driver notification path is triggered.

### Driver app logic tests

1. `dispatchModeEnabled = true` returns empty `availableOrders` and `poolOrders` in `useGlobalOrderAccept` logic.
2. `dispatchModeEnabled = false` restores normal available/pool filtering.
3. Accept error classification remains correct for taken/max-active/not-available.

## Current Automated Coverage Files

- `api/src/services/__tests__/OrderDispatchService.test.ts`
- `api/src/models/Order/resolvers/Mutation/__tests__/assignDriverToOrder.test.ts`
- `mobile-driver/utils/__tests__/driver-logic.test.ts` (contains dispatch-mode related pure-logic tests and can be extended further)

## Practical Vitest Setup Notes

1. Use `vi.useFakeTimers()` for wave timers.
2. Mock `cache.get`, `cache.set`, `cache.del`.
3. Mock `notifyDriversOrderReady` and `notifyDriversOrderExpanded`.
4. Mock repository responses with explicit coordinate and status combinations.
5. Use a `flush` helper (`setTimeout(..., 0)`) for fire-and-forget notification calls.

## Minimal Execution Commands

Run API unit tests:

```bash
cd api
npm run test:unit
```

Run only dispatch-focused tests once created:

```bash
cd api
npx vitest run src/services/__tests__/OrderDispatchService.test.ts src/models/Order/resolvers/Mutation/__tests__/assignDriverToOrder.test.ts
```

## First Build Order For Fast Wins

1. Build first-wave selection tests (radius + minimum + push-only).
2. Add second-wave timer and cancellation tests.
3. Add gas-priority split tests.
4. Add self-assign guard tests.
5. Add dispatchModeEnabled client logic assertions.

This order gives fast confidence on the riskiest behavior first: notification fanout, timer correctness, and race-safe claiming.
