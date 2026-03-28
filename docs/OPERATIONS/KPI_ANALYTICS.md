# KPI Analytics

## Scope

This document describes the logistics KPI layer used to evaluate platform operations, business behavior, and driver efficiency.

The analytics stack is based on:

- Order lifecycle timestamps in `orders`
- Event timeline in `order_events`
- Aggregation service in `api/src/services/AnalyticsService.ts`
- GraphQL analytics queries in `api/src/models/Analytics/Analytics.graphql`
- Admin dashboard consumer in `admin-panel/src/app/dashboard/statistics/page.tsx`

## Data Model

### orders additions

- `driver_assigned_at`: when a driver is assigned to the order
- `driver_arrived_at_pickup`: when the driver indicates arrival at pickup

These columns are required for pickup wait and fake-ready analysis.

### order_events table

`order_events` stores immutable timeline events for order lifecycle and logistics behavior.

Event types:

- `ORDER_CREATED`
- `ORDER_PREPARING`
- `ORDER_READY`
- `ORDER_PICKED_UP`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`
- `DRIVER_ASSIGNED`
- `DRIVER_ARRIVED_PICKUP`
- `DISPATCH_SENT`
- `PREP_TIME_UPDATED`

Actor types:

- `SYSTEM`
- `RESTAURANT`
- `DRIVER`
- `CUSTOMER`
- `ADMIN`

## KPI Definitions

### Operational KPIs

- `totalOrders`: count of orders in range
- `completedOrders`: orders with status `DELIVERED`
- `cancelledOrders`: orders with status `CANCELLED`
- `cancellationRate`: cancelled / total * 100
- `gmv`: sum of `price + delivery_price` for delivered orders
- `aov`: average delivered order value
- `avgDeliveryTimeMin`: avg(`delivered_at - order_date`) in minutes
- `avgPrepTimeMin`: avg(`ready_at - preparing_at`) in minutes
- `prepOverrunRate`: percent where `ready_at > estimated_ready_at`
- `avgDriverWaitAtPickupMin`: avg(`out_for_delivery_at - driver_arrived_at_pickup`) in minutes
- `fakeReadyRate`: percent where `driver_arrived_at_pickup < ready_at`

### Business KPIs

Per business:

- `totalOrders`
- `avgPrepTimeMin`
- `p90PrepTimeMin`
- `prepOverrunRate`
- `prematureReadyRate`: percent where ready is signaled in less than 50% of declared prep window
- `avgDriverWaitAtPickupMin`
- `fakeReadyCount`
- `fakeReadyRate`

### Driver KPIs

Per driver:

- `totalDeliveries`
- `avgDeliveryTimeMin`
- `avgPickupTimeMin`
- `avgWaitAtPickupMin`

### Peak-hour analysis

- Distribution by hour (`0-23`)
- Distribution by day of week
- Derived `peakHour`
- Derived `peakDayOfWeek`

## Fake Ready and Premature Ready

### Fake Ready

Restaurant behavior where driver reaches pickup before order is marked ready.

Condition:

`driver_arrived_at_pickup < ready_at`

### Premature Ready

Restaurant marks order ready too early compared to selected preparation window.

Condition:

`(ready_at - preparing_at) < 0.5 * preparation_minutes`

## GraphQL Surface

Queries:

- `operationalKPIs(startDate, endDate, businessId?)`
- `businessKPIs(startDate, endDate, businessId?)`
- `driverKPIs(startDate, endDate, driverId?)`
- `peakHourAnalysis(startDate, endDate, businessId?)`

Role access:

- `operationalKPIs`: `ADMIN`, `SUPER_ADMIN`
- `peakHourAnalysis`: `ADMIN`, `SUPER_ADMIN`
- `businessKPIs`: `ADMIN`, `SUPER_ADMIN`, `BUSINESS_OWNER` (owner scoped to own business)
- `driverKPIs`: `ADMIN`, `SUPER_ADMIN`, `DRIVER` (driver scoped to own user)

## Event Emission Map

Order events are emitted from mutation flows:

- Start preparing -> `ORDER_PREPARING`
- Preparation time update -> `PREP_TIME_UPDATED`
- Assign driver -> `DRIVER_ASSIGNED`
- Driver arrived/waiting notification -> `DRIVER_ARRIVED_PICKUP`
- Status ready -> `ORDER_READY`
- Status out for delivery -> `ORDER_PICKED_UP`
- Status delivered -> `ORDER_DELIVERED`
- Status cancelled -> `ORDER_CANCELLED`

## Notes

- Event emission is fire-and-forget and non-blocking for business flows.
- Analytics currently reads primary KPIs from `orders` with joins for performance and simplicity.
- `order_events` is available for deep timeline investigations, anomaly root-cause, and future replay/audit analytics.
