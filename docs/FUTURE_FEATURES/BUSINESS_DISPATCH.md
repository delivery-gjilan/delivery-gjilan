# FF2 — Business-Initiated Direct Dispatch

> **Status: Implemented**
> Originally planned: 2026-03-22 | Implemented: 2026-05-xx

---

## What Was Built

A business can request a driver on-demand for a phone/walk-in customer delivery (off-platform order). This is called **Direct Dispatch** and runs through the existing `orders` table with `channel = 'DIRECT_DISPATCH'`, rather than a separate `dispatch_requests` table.

### Architecture Decision

Rather than a new table and a separate driver-accept flow, Direct Dispatch reuses the existing order + dispatch pipeline:
- A new order is created with `channel = 'DIRECT_DISPATCH'` and `recipientPhone` / `recipientName` (no platform user)
- The same `AllOrdersUpdated` subscription dispatches the order to available drivers
- Drivers accept via the existing `ASSIGN_DRIVER_TO_ORDER` mutation
- Settlements, heartbeat, and watchdog remain unchanged — no new driver state required

---

## Database

### `storeSettings` table
- `directDispatchEnabled: boolean` — global platform-wide toggle

### `businesses` table
- `directDispatchEnabled: boolean` — per-business opt-in toggle (both must be true for FAB to show)

### `orders` table (existing)
- `channel: enum('PLATFORM', 'DIRECT_DISPATCH')` — distinguishes order origin
- `recipientPhone: varchar` — phone number of the off-platform recipient
- `recipientName: varchar | null` — optional name of the recipient

---

## API

**GraphQL mutations:**
- `createDirectDispatchOrder(input: CreateDirectDispatchOrderInput!)` — business-role only, creates a `DIRECT_DISPATCH` order with recipient details and drop-off location

**GraphQL queries:**
- `directDispatchAvailability` — returns `{ available: boolean, reason: string | null, freeDriverCount: int }` — business-role only

**Service:** `api/src/services/DirectDispatchService.ts`
- `checkAvailability(businessId)` — validates both `storeSettings.directDispatchEnabled` and `business.directDispatchEnabled`, counts free drivers
- `createOrder(businessId, input)` — creates the order record and fires real-time dispatch to drivers

---

## mobile-business UI

### FAB gating
The "Request Driver" FAB (indigo, phone icon, 56×56) appears on the Orders screen only when:
1. `storeSettings.directDispatchEnabled` = true (from `GET_STORE_STATUS`)
2. `business.directDispatchEnabled` = true (from `GET_BUSINESS_OPERATIONS`)

### `DirectDispatchSheet` component
`mobile-business/components/orders/DirectDispatchSheet.tsx` — slide-up animated bottom sheet:
- Refetches `DirectDispatchAvailability` on open (network-only policy)
- Status banner: green with driver count when available, red when unavailable
- Form: recipientPhone (required), recipientName (optional), address (required), driverNotes (optional)
- Drop-off coordinates are hardcoded (~Gjilan area) — map picker deferred
- On submit: calls `CreateDirectDispatchOrder` mutation, closes sheet, refetches order list

### `OrderCard` — Direct Dispatch display
- `channel === 'DIRECT_DISPATCH'` orders show an indigo "Direct Call" badge (with phone icon) below the status badge
- Customer name/phone shows `recipientName` / `recipientPhone` instead of the platform user record

---

## mobile-driver UI

### `OrderAcceptSheet`
- Orange "Direct Call" badge beside the "New Order" label when `order.channel === 'DIRECT_DISPATCH'`
- Recipient name or phone shown in orange below the business name

### `OrderPoolSheet`
- Left accent bar is orange (`#F97316`) for direct dispatch orders (green = READY, indigo = PREPARING, orange = DIRECT_DISPATCH)
- Orange "Direct Call" badge next to the business name

### `OrderDetailSheet`
- Orange "Direct Call" badge inline in the status pill row
- `customerName` derived from `recipientName ?? recipientPhone` for direct dispatch orders

---

## Localization

- `mobile-business`: `directDispatch` key section (EN + AL) — title, availability strings, field labels, submit button
- `mobile-driver`: `orderAccept.direct_call` (EN: "Direct Call", AL: "Thirrje Direkte")

---

## What Was NOT Built (Deferred)

- Map picker for drop-off coordinates (currently hardcoded to Gjilan area)
- Separate settlement tracking per dispatch run (uses existing delivery-fee settlement path)
- Interpretation B (business dispatching to their own off-platform customers with payment reconciliation)


- Pick up stock from a supplier and bring it to the business
- Deliver goods for a phone/walk-in customer who placed an order off-platform
- Run an internal errand (e.g. drop off keys, pick up equipment)

Currently drivers can only be assigned to platform orders. Businesses have no way to request a driver independently.

---

## Chosen Interpretation

**Interpretation A — Business requests a driver for an internal run.**
There is no platform customer, no cart, and no payment collection through the platform. The business initiates the run, a driver accepts it, and the run is tracked independently of the order system.

**Interpretation B (deferred)** — Business has their own off-platform customers and wants to use the driver pool for delivery. This is more complex (requires off-platform customer data, payment reconciliation) and is explicitly out of scope for FF2.

---

## Core Design Constraint: Driver Availability Collision

This is the hardest part. Platform orders and dispatch requests share the same driver pool. The implementation must:

1. **Mark a driver as unavailable** to the platform while on a dispatch run
2. **Respect driver priority** — the platform decides whether a driver mid-dispatch-run can also receive a platform order, or must finish the run first
3. **Use the same heartbeat/watchdog system** — a driver on a dispatch run must still send location heartbeats; the watchdog must not reassign or flag them as stale
4. **Track earnings separately** — dispatch run earnings need their own settlement record, separate from order-based commissions

> ⚠️ Re-read B4 (WATCHDOG_HEARTBEAT) carefully before implementing. The watchdog state machine owns driver availability — any new "driver is occupied" state must be registered there.

---

## Proposed Architecture

> ⚠️ Verify all table/column names against B7 before implementing.

### Database

```sql
CREATE TABLE dispatch_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_business_id UUID NOT NULL REFERENCES businesses(id),
  driver_id             UUID REFERENCES drivers(id),          -- null until accepted
  status                dispatch_status NOT NULL DEFAULT 'PENDING',
  pickup_address        VARCHAR(500) NOT NULL,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       VARCHAR(500) NOT NULL,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  notes                 VARCHAR(1000),
  agreed_fee            NUMERIC(10,2),                        -- fee paid to driver
  accepted_at           TIMESTAMP WITH TIME ZONE,
  picked_up_at          TIMESTAMP WITH TIME ZONE,
  completed_at          TIMESTAMP WITH TIME ZONE,
  cancelled_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE dispatch_status AS ENUM (
  'PENDING',       -- business submitted, waiting for driver
  'ACCEPTED',      -- driver accepted
  'IN_PROGRESS',   -- driver picked up
  'COMPLETED',
  'CANCELLED'
);
```

### API

- `Mutation.createDispatchRequest(businessId, pickupAddress, dropoffAddress, notes, agreedFee)` — business initiates
- `Mutation.acceptDispatchRequest(dispatchId)` — driver accepts
- `Mutation.updateDispatchStatus(dispatchId, status)` — driver moves through IN_PROGRESS → COMPLETED
- `Mutation.cancelDispatchRequest(dispatchId)` — business or driver cancels
- `Query.myDispatchRequests(businessId)` — business sees their requests
- `Query.availableDispatchRequests` — driver sees open requests nearby
- `Subscription.dispatchRequestUpdated(dispatchId)` — real-time updates to business and driver

### Notification Flow

1. Business creates dispatch request → push notification to all available drivers (new FCM category: `dispatch-request`)
2. Driver accepts → push to business confirming acceptance
3. Driver picks up → push to business (IN_PROGRESS)
4. Driver completes → push to business + settlement record created

### Driver App Changes

- New section in driver app: "Dispatch Runs" alongside regular orders
- Accept/reject UI for incoming dispatch requests
- Same map/navigation flow as regular order delivery, but with dispatch pickup address instead of restaurant

### Business App Changes

- New section: "Request a Driver" form (pickup, dropoff, notes, agreed fee)
- Dispatch history list with status tracking
- Real-time status updates via subscription

---

## Driver Availability Integration

When a driver **accepts** a dispatch request:
- Set driver status to `BUSY_DISPATCH` (new state to add to watchdog)
- Driver becomes unavailable for new platform orders
- Heartbeat continues as normal — watchdog must recognise `BUSY_DISPATCH` as a valid active state (not stale)

When dispatch is **COMPLETED or CANCELLED**:
- Driver status returns to `AVAILABLE`
- Driver re-enters platform order pool

> The exact state names must be verified against B4 (WATCHDOG_HEARTBEAT) at implementation time.

---

## Settlement

Dispatch runs have a separately negotiated `agreed_fee` between business and driver. Settlement should:
- Create a `settlement_request` (or equivalent — verify B7/BL1 for current table name) linked to the dispatch run ID rather than an order ID
- Track commission separately from order-based commissions
- Be visible in the driver's earnings history

---

## What Was Already in Place (as of 2026-03-22)

> Re-verify each before implementing.

- ✅ Drivers table with UUID-based identity
- ✅ Driver heartbeat + watchdog system (B4) — must be extended, not replaced
- ✅ FCM push pipeline for driver notifications (M2, O4)
- ✅ Settlement infrastructure (BL1)
- ✅ GraphQL subscriptions via graphql-ws (A1, B1)
- ✅ Business app auth with `businessId` and `businessType` in auth store

## Build Checklist

| Component | Effort |
|-----------|--------|
| `dispatch_requests` table + migration | Small |
| `BUSY_DISPATCH` state in watchdog (B4) | Medium — touches core driver availability |
| GraphQL schema + resolvers (4 mutations, 2 queries, 1 subscription) | Medium |
| Driver app: dispatch request list + accept/reject UI | Medium |
| Driver app: map/navigation for dispatch run | Small (reuse existing nav flow) |
| Business app: request form + history | Medium |
| FCM category: `dispatch-request` notifications | Small |
| Settlement record for completed dispatch | Small |

## Open Questions (resolve at implementation time)

- Can a driver have a platform order AND a dispatch run active simultaneously? (probably not in v1)
- Who can cancel after acceptance — business only, driver only, or either party with a reason?
- Should dispatch runs be visible in the admin panel? If so, read UI1 and admin panel docs first.
- Does the `agreed_fee` get platform commission deducted, or is it 100% to the driver?
- Should there be a rating/review after a dispatch run?
