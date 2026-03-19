# Mobile Order Subscription Sync MB

<!-- MDS:M7 | Domain: Mobile | Updated: 2026-03-19 -->
<!-- Depends-On: A1, BL3, M3 -->
<!-- Depended-By: M4 -->
<!-- Nav: Order tracking reconstruction details. Update when subscription payload shape, cache writes, or fallback policy changes. -->

## Purpose

Define the source-of-truth strategy for customer mobile order tracking so active-order UI updates are fast, consistent, and resilient during reconnects.

## Current Contract

1. Primary path is subscription-first:
   - `userOrdersUpdated` payload is applied directly to Apollo cache (`GET_ORDERS`, `GET_ORDER`).
   - The same payload updates Zustand active-order state immediately.
2. Fallback path is refetch-only-on-exception:
   - WS reconnect event.
   - Missing/invalid payload data.
   - Payload-apply error.
3. Active-order rules:
   - Include statuses other than `DELIVERED` and `CANCELLED`.
   - Remove from active store when status becomes terminal.

## Why This Pattern

1. Reduces network chatter compared to refetching on every event.
2. Avoids reconnect stale UI by preserving a controlled network backfill.
3. Keeps screen watchers and floating bar synchronized via shared cache + store updates.

## Files Involved

1. `mobile-customer/modules/orders/hooks/useOrdersSubscription.ts`
2. `mobile-customer/graphql/operations/orders/subscriptions.ts`
3. `mobile-customer/lib/graphql/apolloClient.ts`
4. `mobile-customer/modules/orders/store/activeOrdersStore.ts`

## Change Safety Checklist

When editing order realtime behavior, verify:

1. Subscription payload includes fields needed by active-order UI (`id`, `userId`, `status`, `updatedAt`, ETA/driver info).
2. Cache updates still target both `GET_ORDERS` and `GET_ORDER`.
3. Reconnect fallback still performs network resync.
4. Terminal statuses always remove from active store.
5. Active orders screen and floating bar both reflect updates without opening order details.

## Known Tradeoff

- If payload shape drifts from query shape and codegen is stale, fallback refetch protects correctness but should be treated as a signal to align operation fields and regenerate GraphQL artifacts.
