# FF2 — Business-Initiated Driver Dispatch

> **Status: Future Feature — Not yet implemented**
> Discussed: 2026-03-22

## Current Behavior Note

The live product also contains an order-based direct-call flow that uses regular `orders` rows with a business owner, recipient phone/name, and no cart items. In admin surfaces, the business label for those orders is derived from `orders.businessId` when the order has no `orderItems`, so the orders page and map page still show the originating business name for direct-call requests.

---

## ⚠️ Pre-Implementation Checklist

> **Before writing a single line of code, read the current MDS docs.**
> The system changes continuously. The design below was accurate on 2026-03-22 — driver lifecycle, order flow, settlement rules, and notification patterns may have all evolved.

| Doc | Why you need it |
|-----|----------------|
| [A1 — ARCHITECTURE](../ARCHITECTURE.md) | Understand the full system topology — dispatch runs alongside the existing order flow |
| [B4 — WATCHDOG_HEARTBEAT](../BACKEND/WATCHDOG_HEARTBEAT.md) | **Critical** — driver availability and presence are managed here; dispatch requests must plug into the same availability lock |
| [B2 — ORDER_CREATION](../BACKEND/ORDER_CREATION.md) | Understand what an "order" is today so dispatch is designed to be a clearly separate concept |
| [B7 — DATABASE_SCHEMA](../BACKEND/DATABASE_SCHEMA.md) | Verify `drivers`, `orders`, `businesses` schema before adding `dispatch_requests` table |
| [BL1 — SETTLEMENTS](../BUSINESS_LOGIC/SETTLEMENTS_AND_PROMOTIONS.md) | Dispatch earnings need a settlement path; check existing settlement rules to avoid conflicts |
| [M2 — PUSH & LIVE ACTIVITY](../MOBILE/PUSH_AND_LIVE_ACTIVITY.md) | Driver notification for dispatch must use the same FCM/APNs pipeline |
| [B1 — API](../BACKEND/API.md) | Verify GraphQL resolver patterns and `@skipAuth` / `@requiresAuth` conventions |
| [O4 — PUSH AUDIT](../OPERATIONS/PUSH_NOTIFICATIONS_AUDIT.md) | Check driver device token coverage before adding a new notification category |
| [MDS_INDEX](../MDS_INDEX.md) | Read the full index for any docs added since 2026-03-22 that are relevant |

---

## Problem

A business (market, restaurant, pharmacy) occasionally needs a driver to handle a run that is not a customer order — for example:

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
