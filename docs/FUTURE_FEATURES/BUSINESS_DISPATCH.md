# FF2 — Business-Initiated Direct Dispatch

> **Status:** Implemented
> **Scope:** Business can request a driver for call-in/off-platform deliveries using existing order/dispatch pipelines.

---

## Current Behavior

Direct Dispatch creates normal `orders` rows with `channel = DIRECT_DISPATCH` instead of introducing a separate dispatch table.

- Business requests a driver from mobile-business.
- API creates a lightweight order with recipient details and preparation timing.
- The create flow publishes the all-orders subscription immediately, so admin orders and map surfaces receive the new order without waiting for a later status change.
- Admin order mapping derives the business label from `orders.businessId` when there are no `orderItems`, so direct-call orders still show the originating business.
- Existing early-dispatch + READY dispatch flow sends it to available drivers.
- Driver accepts using the normal assignment flow.

---

## Data Model

### `storeSettings`
- `directDispatchEnabled: boolean` (global gate)

### `businesses`
- `directDispatchEnabled: boolean` (per-business gate)
- `directDispatchFixedAmount: number` (per-business fixed delivery fee set by admin)

### `orders`
- `channel: PLATFORM | DIRECT_DISPATCH`
- `recipientPhone: string`
- `recipientName: string | null`

---

## API Surface

### Query
- `directDispatchAvailability`
  - Returns `{ available, reason, freeDriverCount }`
  - Business-role only

### Mutation
- `createDirectDispatchOrder(input)`
  - Business-role only
  - Input includes `preparationMinutes`
  - Creates a `DIRECT_DISPATCH` order and enters normal dispatch flow

### Service
- `api/src/services/DirectDispatchService.ts`
  - `checkAvailability(businessId)` verifies global + per-business gates and counts available drivers
  - validates per-business `directDispatchFixedAmount > 0`
  - `createOrder(input, requestingUserId)` inserts the order
  - uses business-level `directDispatchFixedAmount` as order `deliveryPrice`
  - creates the order in `PREPARING` with `preparationMinutes` and `estimatedReadyAt`

---

## Driver Availability Logic

Availability is based only on real driver availability and capacity.

A driver counts as available when all are true:
- `onlinePreference = true`
- `connectionStatus = CONNECTED`
- assigned active order count is below `maxActiveOrders`

No reserve subtraction is applied.
No pending unassigned order subtraction is applied.

`freeDriverCount` is the number of drivers matching the above conditions.

---

## mobile-business

### FAB Visibility
The request-driver FAB appears only when:
1. `storeSettings.directDispatchEnabled = true`
2. `business.directDispatchEnabled = true`

### Direct Dispatch Sheet
`mobile-business/components/orders/DirectDispatchSheet.tsx`

- Checks `directDispatchAvailability` on open
- Shows free-driver status banner
- Collects recipient phone/name, preparation minutes, address, driver notes
- Does not expose the fixed amount in the request modal
- Submits `createDirectDispatchOrder`

### Active Order Visibility
`OUT_FOR_DELIVERY` direct-dispatch orders remain in the upcoming/active order list so the business can continue operational follow-up without a navigation flow.

---

## mobile-driver

Direct Dispatch orders are visually distinct:
- `OrderAcceptSheet`: orange Direct Call badge + recipient label
- `OrderAcceptSheet`: direct-call earnings label shown as “Agreed fee”
- `OrderPoolSheet`: orange accent + Direct Call badge
- `OrderDetailSheet`: Direct Call badge + recipient identity + “Agreed fee” earnings label

---

## admin-panel

- Orders list/detail consume `channel`, `recipientPhone`, `recipientName` and show Direct Call context.
- Per-business Direct Dispatch settings (`directDispatchEnabled`, `directDispatchFixedAmount`) are available in:
  - list-page edit modal (`EditBusinessModal`)
  - detail-page edit modal (`EditBusinessDetailModal`)
- Global toggle exists in topbar store-status controls.

---

## Deferred Items

- Map picker for direct-dispatch dropoff coordinates (currently fixed fallback coordinates in mobile-business flow)
- Dedicated settlement model separate from standard delivery settlement path
- Separate off-platform customer billing/reconciliation workflow
