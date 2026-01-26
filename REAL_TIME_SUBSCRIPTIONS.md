# Real-Time Subscriptions Implementation

## Overview
Replaced polling with WebSocket subscriptions for real-time order updates in both the admin panel and mobile app.

## Changes Made

### Backend (API)

#### 1. PubSub Topics (`api/src/lib/pubsub.ts`)
- Added `AllOrdersPayload` type for admin-wide order updates
- Added `orders.all.changed` topic to pubsub payload map
- Created `allOrdersChanged()` topic function
- Updated publish/subscribe function overloads

#### 2. GraphQL Schema (`api/src/models/Order/Order.graphql`)
- Added new subscription: `allOrdersUpdated: [Order!]! @skipAuth`
- This subscription allows admins to receive all order updates in real-time

#### 3. Order Service (`api/src/services/OrderService.ts`)
- Added `subscribeToAllOrders()` method to subscribe to admin-wide order updates
- Added `publishAllOrders()` method to publish to all admin subscribers
- Method fetches all uncompleted orders and publishes them to the admin channel

#### 4. Mutation Resolvers
Updated all order mutations to publish to both user-specific and admin-wide channels:

- **createOrder** (`api/src/models/Order/resolvers/Mutation/createOrder.ts`)
  - Publishes to user channel: `publishUserOrders(userId)`
  - Publishes to admin channel: `publishAllOrders()`

- **updateOrderStatus** (`api/src/models/Order/resolvers/Mutation/updateOrderStatus.ts`)
  - Finds order to get userId
  - Publishes to user channel: `publishUserOrders(userId)`
  - Publishes to admin channel: `publishAllOrders()`

- **cancelOrder** (`api/src/models/Order/resolvers/Mutation/cancelOrder.ts`)
  - Finds order to get userId
  - Publishes to user channel: `publishUserOrders(userId)`
  - Publishes to admin channel: `publishAllOrders()`

#### 5. Subscription Resolver (`api/src/models/Order/resolvers/Subscription/allOrdersUpdated.ts`)
- Implemented `allOrdersUpdated` subscription resolver
- Authorization: Only SUPER_ADMIN, DRIVER, and BUSINESS_ADMIN can subscribe
- Returns all orders stream via `orderService.subscribeToAllOrders()`

### Admin Panel

#### 1. Subscription Query (`admin-panel/src/graphql/operations/orders/subscriptions.ts`)
- Added `ALL_ORDERS_SUBSCRIPTION` GraphQL subscription
- Queries all order fields including businesses, items, status, location, etc.

#### 2. useOrders Hook (`admin-panel/src/lib/hooks/useOrders.ts`)
- **Removed polling**: Deleted `pollInterval: 2000` from useQuery
- **Added subscription**: Using `useSubscription(ALL_ORDERS_SUBSCRIPTION)`
- **Data merging**: Uses subscription data when available, falls back to query data
- Initial load: `useQuery` with `fetchPolicy: 'cache-and-network'`
- Real-time updates: `useSubscription` for instant order changes

### Mobile Customer App

#### 1. useOrders Hook (`mobile-customer/modules/orders/hooks/useOrders.ts`)
- **Added subscription**: Using `useSubscription(USER_ORDERS_UPDATED)`
- **Token authentication**: Passes user token for subscription authentication
- **Data merging**: Uses subscription data when available, falls back to query data
- Initial load: `useQuery` with `fetchPolicy: 'cache-and-network'`
- Real-time updates: Customer sees status changes instantly when admin updates order

## How It Works

### Order Creation Flow (Customer → Admin)
1. Customer creates order via mobile app
2. `createOrder` mutation executes
3. Backend publishes to:
   - User-specific channel: Customer sees order in their list
   - Admin channel: All admins see new order appear instantly
4. Admin panel subscription receives update
5. Order appears in real-time without refresh

### Order Status Update Flow (Admin → Customer)
1. Admin updates order status in admin panel
2. `updateOrderStatus` mutation executes
3. Backend publishes to:
   - User-specific channel: Customer sees status change
   - Admin channel: All admins see updated status
4. Customer's mobile app subscription receives update
5. Status changes in real-time (e.g., PENDING → ACCEPTED → OUT_FOR_DELIVERY)

### Subscription Authorization
- **Customer subscriptions** (`USER_ORDERS_UPDATED`): Authenticated users see their own orders
- **Admin subscriptions** (`allOrdersUpdated`): 
  - SUPER_ADMIN: See all orders
  - BUSINESS_ADMIN: See all orders (filtered by role in queries)
  - DRIVER: See all orders
  - CUSTOMER: Unauthorized (throws error)

## Benefits

### Before (Polling)
- Admin panel polled every 2 seconds
- High server load with repeated queries
- 0-2 second delay for updates
- Unnecessary database queries even when no changes

### After (WebSockets)
- Instant updates via WebSocket push
- Lower server load (one connection vs repeated queries)
- Zero delay for updates
- Database queries only when data actually changes

## Testing

### Test Admin Real-Time Updates
1. Open admin panel in browser
2. Navigate to Orders page
3. Create an order from mobile app
4. ✅ Order should appear instantly in admin panel

### Test Customer Status Updates
1. Open mobile app as customer
2. Create an order
3. Open admin panel
4. Change order status (PENDING → ACCEPTED)
5. ✅ Status should update instantly in mobile app

### Test Multiple Admins
1. Open admin panel in two different browsers
2. In one browser, change order status
3. ✅ Both browsers should update instantly

## Notes

- WebSocket connection uses `ws://localhost:4000/graphql` (same endpoint as HTTP)
- Apollo Client split link handles HTTP vs WebSocket routing automatically
- Subscriptions reconnect automatically on connection loss
- All subscriptions use `@skipAuth` directive but authentication happens in resolver context
