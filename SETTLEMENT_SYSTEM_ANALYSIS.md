# Settlement System - Deep Dive Analysis

## 📋 Executive Summary

The settlement system tracks financial obligations between the marketplace platform (owner), businesses, and drivers. It automatically creates settlement records when orders are delivered, calculating commissions owed by drivers and businesses to the platform.

**Current Status**: ✅ Functional but has architectural issues and missing features
**Last Updated**: March 10, 2026

---

## 🏗️ Architecture Overview

### Core Concept
The platform (marketplace owner) earns money through:
1. **Business Commissions**: % of each business's subtotal from orders
2. **Driver Commissions**: % of delivery fees earned by drivers

### Settlement Types
- `DRIVER_PAYMENT`: Driver owes platform commission from delivery fees
- `BUSINESS_PAYMENT`: Business owes platform commission from order subtotals

### Settlement Status
- `PENDING`: Not yet paid to platform
- `PAID`: Settlement has been paid
- `OVERDUE`: ⚠️ Defined in schema but **not currently used**

---

## 📊 Database Schema

**Table**: `settlements`

```typescript
{
  id: UUID (PK)
  type: 'DRIVER_PAYMENT' | 'BUSINESS_PAYMENT'
  
  // Relationships (one will be set based on type)
  driverId: UUID (FK -> drivers.id, nullable)
  businessId: UUID (FK -> businesses.id, nullable)
  orderId: UUID (FK -> orders.id, required)
  
  // Financial
  amount: NUMERIC(10, 2)  // Amount owed to platform
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  
  // Timestamps
  paidAt: TIMESTAMP (nullable)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

**Indexes**:
- `idx_settlements_order_id` on orderId
- `idx_settlements_driver_id` on driverId
- `idx_settlements_business_id` on businessId
- `idx_settlements_status` on status

**Relations**:
- `driver` → One-to-one with drivers table
- `business` → One-to-one with businesses table
- `order` → One-to-one with orders table

---

## 💰 Commission Configuration

### Driver Commission
**Location**: `drivers.commissionPercentage`
- Type: `NUMERIC(5, 2)` (e.g., 15.50 for 15.5%)
- Default: `0`
- Applied to: Delivery fee only
- **Formula**: `driverSettlement = deliveryPrice × (commissionPercentage / 100)`

### Business Commission
**Location**: `businesses.commissionPercentage`
- Type: `NUMERIC(5, 2)`
- Default: `0`
- Applied to: Business's subtotal from order items
- **Formula**: `businessSettlement = businessSubtotal × (commissionPercentage / 100)`

### Commission Management
**Mutation**: `updateCommissionPercentage`
```graphql
updateCommissionPercentage(
  driverId: ID
  businessId: ID
  percentage: Float!  # 0-100
): Boolean!
```

---

## 🔄 Settlement Creation Flow

### Trigger Point
**File**: `api/src/models/Order/resolvers/Mutation/updateOrderStatus.ts`

Settlements are created when an order transitions to `DELIVERED` status:

```typescript
if (status === 'DELIVERED' && currentStatus !== 'DELIVERED') {
  const db = await getDB();
  const refreshed = await orderService.orderRepository.findById(id);
  if (refreshed) {
    const items = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));
    const financialService = new FinancialService(db);
    await financialService.createOrderSettlements(
      refreshed, 
      items, 
      refreshed.driverId
    );
  }
}
```

### Settlement Creation Logic
**File**: `api/src/services/FinancialService.ts`

**Step 1: Prevent Duplicates**
```typescript
const existing = await this.settlementRepo.getSettlements({ orderId: order.id });
if (existing.length > 0) return;  // Already created
```

**Step 2: Group Items by Business**
- Fetch all products for the order items
- Map items to their respective businesses
- Calculate subtotal per business

**Step 3: Create Business Settlements**
For each business in the order:
```typescript
const businessSubtotal = items.reduce(
  (sum, item) => sum + item.price * item.quantity, 
  0
);
const commissionPercentage = business?.commissionPercentage ?? 0;
const businessAmount = businessSubtotal * (commissionPercentage / 100);

if (businessAmount > 0) {
  await settlementRepo.createSettlement(
    'BUSINESS_PAYMENT',
    null,              // No driver
    businessId,
    orderId,
    businessAmount
  );
}
```

**Step 4: Create Driver Settlement**
```typescript
const driver = await driverRepo.getDriverByUserId(driverId) 
  || await driverRepo.createDriver(driverId);
const driverCommissionPercentage = driver?.commissionPercentage ?? 0;
const driverAmount = order.deliveryPrice * (driverCommissionPercentage / 100);

if (driverAmount > 0 && driver?.id) {
  await settlementRepo.createSettlement(
    'DRIVER_PAYMENT',
    driver.id,
    null,              // No business
    orderId,
    driverAmount
  );
}
```

---

## 🚨 Order Cancellation

**File**: `api/src/services/FinancialService.ts`

When an order is cancelled:
```typescript
async cancelOrderSettlements(orderId: string): Promise<void> {
  const deleted = await settlementRepo.deletePendingByOrderId(orderId);
  // Only deletes PENDING settlements
  // PAID settlements remain (manual handling required)
}
```

**Important**: This is called from `OrderService.cancelOrder()` and only affects `PENDING` settlements. If a settlement was already marked as `PAID`, it won't be deleted and must be manually reconciled.

---

## 📡 GraphQL API

### Queries

#### 1. Get Settlements (with filters)
```graphql
query {
  settlements(
    type: SettlementType          # DRIVER_PAYMENT | BUSINESS_PAYMENT
    status: SettlementStatus       # PENDING | PAID
    driverId: ID
    businessId: ID
    startDate: Date
    endDate: Date
    limit: Int
    offset: Int
  ) {
    id
    type
    driver { ... }
    business { ... }
    order { ... }
    amount
    status
    paidAt
    createdAt
    updatedAt
  }
}
```

**Authorization**: 
- Drivers automatically scoped to their settlements only
- Super admins can see all
- Business owners/employees: ⚠️ **Not currently scoped** (potential security issue)

#### 2. Settlement Summary
```graphql
query {
  settlementSummary(
    type: SettlementType
    driverId: ID
    businessId: ID
    startDate: Date
    endDate: Date
  ) {
    totalAmount      # Total across all settlements
    totalPending     # Sum of PENDING settlements
    totalPaid        # Sum of PAID settlements
    count            # Number of settlements
    pendingCount     # Number of PENDING settlements
  }
}
```

#### 3. Driver/Business Balance
```graphql
query {
  driverBalance(driverId: ID!) {
    totalAmount
    totalPending
    totalPaid
    count
    pendingCount
  }
  
  businessBalance(businessId: ID!) {
    totalAmount
    totalPending
    totalPaid
    count
    pendingCount
  }
}
```

### Mutations

#### 1. Mark Single Settlement as Paid
```graphql
mutation {
  markSettlementAsPaid(settlementId: ID!): Settlement!
}
```
Sets status to `PAID`, records `paidAt` timestamp.

#### 2. Mark Multiple Settlements as Paid
```graphql
mutation {
  markSettlementsAsPaid(ids: [ID!]!): [Settlement!]!
}
```
Bulk operation for batch payment processing.

#### 3. Partial Payment
```graphql
mutation {
  markSettlementAsPartiallyPaid(
    settlementId: ID!
    amount: Float!
  ): Settlement!
}
```

**Logic**:
1. Validate: `0 < amount < currentAmount`
2. Create new settlement with `amount` marked as `PAID`
3. Update original settlement to `remainingAmount`
4. Both settlements keep same order/driver/business reference

⚠️ **Issue**: Creates duplicate settlements for same order, may complicate reporting.

#### 4. Unsettle (Reverse Payment)
```graphql
mutation {
  unsettleSettlement(settlementId: ID!): Settlement!
}
```
Sets status back to `PENDING`, clears `paidAt`.

#### 5. Backfill Historical Orders
```graphql
mutation {
  backfillSettlementsForDeliveredOrders: Int!
}
```
Iterates all `DELIVERED` orders and creates missing settlements. Used for data migration.

### Subscriptions

```graphql
subscription {
  settlementCreated(type: SettlementType): Settlement!
  settlementStatusChanged(id: ID!): Settlement!
}
```

⚠️ **Status**: Defined in GraphQL schema but **implementation files are minimal/incomplete**.

---

## 🎨 UI Implementation

### 1. Mobile Admin App (`mobile-admin`)
**File**: `mobile-admin/app/settlements.tsx`

**Features**:
- Lists all settlements (no filtering visible)
- Shows business name, amount, paid status
- Displays period (start/end dates) - ⚠️ **Note**: Schema has no period fields
- "Mark Paid" button for unpaid settlements
- Uses `GET_SETTLEMENTS` and `MARK_SETTLEMENT_PAID` mutations

**Issues**:
- References `periodStart` and `periodEnd` fields that don't exist in schema
- No filtering by type (shows both driver and business settlements mixed)
- No date range filtering in UI

### 2. Mobile Driver App (`mobile-driver`)
**File**: `mobile-driver/app/(tabs)/add.tsx`

**Features**:
- Summary cards showing:
  - Net earnings (total amount)
  - Total paid
  - Total pending with pending count
- Period selector (Today, Week, Month, All Time)
- List of individual settlements with:
  - Business names
  - Drop-off address
  - Amount earned
  - Payment status badge
  - Payment date (if paid)
- Pull-to-refresh
- Auto-scoped to logged-in driver

**Well Designed**: ✅ Clean UI with good UX

### 3. Mobile Business App (`mobile-business`)
**Status**: ❌ **No settlement UI exists**

Businesses cannot currently:
- View their outstanding settlements
- See payment history
- Check commission rates

### 4. Admin Panel (`admin-panel`)
**Status**: ❌ **No settlement UI exists**

Missing admin features:
- Settlement management dashboard
- Bulk payment operations
- Financial reporting
- Commission configuration

---

## 🐛 Issues & Problems

### Critical Issues

1. **Missing Business UI** 🔴
   - Businesses have no visibility into what they owe
   - No payment tracking or history
   - No transparency on commission calculations

2. **Partial Payment Logic** 🔴
   - Creates duplicate settlements for same order
   - Makes reporting and reconciliation difficult
   - No clear audit trail
   - Original settlement ID changes after partial payment

3. **Security Gap in Queries** 🔴
   - Business settlements queries not properly scoped
   - Business owners might see other businesses' settlements

4. **Period Fields Mismatch** 🟡
   - Mobile admin UI references `periodStart` and `periodEnd`
   - These fields don't exist in schema
   - Likely causes runtime errors or displays undefined

5. **Incomplete Subscriptions** 🟡
   - GraphQL subscriptions defined but not implemented
   - Real-time updates won't work

6. **OVERDUE Status Unused** 🟡
   - Defined in schema but never set
   - No automated job to mark overdue settlements
   - No overdue payment tracking

### Missing Features

7. **No Reconciliation Tools** 🟡
   - No way to match settlements to actual payments received
   - No payment reference tracking
   - No dispute resolution workflow

8. **Limited Reporting** 🟡
   - No financial reports generation
   - No commission analysis
   - No revenue tracking by business/driver

9. **No Payment Methods** 🟡
   - System only tracks "paid" or "not paid"
   - No integration with payment processors
   - No support for different payment methods (cash, bank transfer, etc.)

10. **No Bulk Operations UI** 🟡
    - Backend supports `markSettlementsAsPaid` bulk mutation
    - No frontend UI to select multiple settlements

### Design Concerns

11. **One Settlement Per Order** 🟡
    - Current: One settlement record per business per order
    - Issue: If order has 3 businesses, creates 3 separate settlements
    - Alternative: Could batch settlements by period

12. **No Settlement Batching** 🟡
    - Creates individual settlements for each order
    - Could optimize by batching settlements per period (weekly, monthly)
    - Reduces record count for high-volume businesses/drivers

13. **Commission Stored Separately** 🟡
    - Commission % stored on driver/business entities
    - If commission changes, historical settlements don't reflect old rate
    - No commission rate history/versioning

---

## 💡 Recommendations for Refactoring

### High Priority

1. **Add Business Settlement UI** 🔥
   - Create settlements page in mobile-business app
   - Show outstanding balance
   - Display payment history
   - Show commission rate

2. **Fix Security Scoping** 🔥
   - Add businessId scoping in settlements query resolver
   - Ensure businesses only see their own settlements

3. **Fix Period Fields Issue** 🔥
   - Remove `periodStart`/`periodEnd` from mobile-admin UI
   - Use `createdAt` for display instead
   - Or add these fields to schema if period grouping is needed

4. **Redesign Partial Payments** 🔥
   - Option A: Remove partial payment feature entirely
   - Option B: Create separate `payment_transactions` table
   - Store payment history separately from settlement records

### Medium Priority

5. **Add Settlement Batching**
   - Group settlements by period (weekly/monthly)
   - Reduce individual records
   - Simplify reconciliation

6. **Implement OVERDUE Logic**
   - Add cron job to mark overdue settlements
   - Define payment terms (e.g., 14 days)
   - Send notifications for overdue payments

7. **Build Admin Dashboard**
   - Financial overview
   - Settlement management
   - Commission configuration UI
   - Bulk payment processing

8. **Add Payment Reconciliation**
   - Payment reference tracking
   - Match settlements to bank transactions
   - Dispute management workflow

### Low Priority

9. **Commission History**
   - Version commission rates
   - Track when rates change
   - Store rate used for each settlement

10. **Enhanced Reporting**
    - Revenue by period
    - Commission analysis
    - Business/driver performance metrics
    - Export to CSV/PDF

11. **Complete Subscriptions**
    - Implement real-time settlement updates
    - Notify on payment status changes

---

## 🔍 Technical Details

### Repository Methods

**File**: `api/src/repositories/SettlementRepository.ts`

Key methods:
- `getSettlementById(id)` - Fetch single settlement
- `getSettlements(filters)` - Fetch filtered list
- `getSettlementSummary(filters)` - Aggregate calculations
- `getDriverBalance(driverId)` - Driver-specific summary
- `getBusinessBalance(businessId)` - Business-specific summary
- `createSettlement(...)` - Create new settlement
- `markAsPaid(settlementId)` - Single payment
- `markMultipleAsPaid(ids[])` - Bulk payment
- `markAsPartiallyPaid(settlementId, amount)` - Partial payment
- `unsettleSettlement(settlementId)` - Reverse payment
- `deletePendingByOrderId(orderId)` - Cancel pending settlements

### Service Layer

**File**: `api/src/services/FinancialService.ts`

Main service class handling all commission and settlement business logic:
- `createOrderSettlements(order, items, driverId)` - Main creation logic
- `cancelOrderSettlements(orderId)` - Handle order cancellation
- `groupItemsByBusiness(items)` - Helper to organize items by business

---

## 📈 Sample Calculations

### Example Order

**Order Details**:
- Customer orders from 2 businesses:
  - Business A: €45 subtotal
  - Business B: €30 subtotal
- Delivery fee: €5
- Driver commission: 20%
- Business A commission: 10%
- Business B commission: 15%

**Settlements Created**:
1. **Business A Settlement**:
   - Type: `BUSINESS_PAYMENT`
   - Amount: €45 × 10% = **€4.50**
   
2. **Business B Settlement**:
   - Type: `BUSINESS_PAYMENT`
   - Amount: €30 × 15% = **€4.50**

3. **Driver Settlement**:
   - Type: `DRIVER_PAYMENT`
   - Amount: €5 × 20% = **€1.00**

**Total Platform Revenue**: €10.00 (from this order)

---

## 🧪 Testing Considerations

### Test Scenarios

1. **Settlement Creation**
   - ✅ Order with single business
   - ✅ Order with multiple businesses
   - ✅ Order with/without driver
   - ✅ Zero commission scenarios
   - ✅ Duplicate prevention

2. **Order Cancellation**
   - ✅ Cancel with pending settlements
   - ✅ Cancel with paid settlements (should not delete)

3. **Payment Operations**
   - ✅ Mark as paid
   - ✅ Partial payment
   - ✅ Bulk payment
   - ✅ Unsettle

4. **Query Authorization**
   - ❌ Business scoping (needs fixing)
   - ✅ Driver scoping
   - ✅ Admin access

---

## 📚 Related Files

### Backend
- **Schema**: `api/database/schema/settlements.ts`
- **Repository**: `api/src/repositories/SettlementRepository.ts`
- **Service**: `api/src/services/FinancialService.ts`
- **GraphQL Schema**: `api/src/models/Settlement/Settlement.graphql`
- **Resolvers**:
  - `api/src/models/Settlement/resolvers/Query/settlements.ts`
  - `api/src/models/Settlement/resolvers/Query/settlementSummary.ts`
  - `api/src/models/Settlement/resolvers/Mutation/markSettlementAsPaid.ts`
  - `api/src/models/Settlement/resolvers/Mutation/markSettlementsAsPaid.ts`
  - `api/src/models/Settlement/resolvers/Mutation/markSettlementAsPartiallyPaid.ts`
  - `api/src/models/Settlement/resolvers/Mutation/unsettleSettlement.ts`
  - `api/src/models/Settlement/resolvers/Mutation/updateCommissionPercentage.ts`
  - `api/src/models/Settlement/resolvers/Mutation/backfillSettlementsForDeliveredOrders.ts`

### Frontend
- **Driver App**: `mobile-driver/app/(tabs)/add.tsx`
- **Admin Mobile**: `mobile-admin/app/settlements.tsx`
- **GraphQL Operations**: `mobile-driver/graphql/operations/driver.ts`

---

## 🎯 Key Questions for Refactoring

1. **Settlement Granularity**: One settlement per order or batch by period?
2. **Partial Payments**: Keep or remove? If keep, how to properly implement?
3. **Payment Terms**: What constitutes "overdue"? (7 days, 14 days, 30 days?)
4. **Payment Methods**: Track payment method (cash, bank transfer, etc.)?
5. **Reconciliation**: How to match settlements to actual payments received?
6. **Commission Changes**: Should historical data show old or new commission rates?
7. **Business UI**: What features do businesses need most urgently?
8. **Reporting**: What financial reports are required?
9. **Notifications**: Alert drivers/businesses about pending payments?
10. **Multi-currency**: Is multi-currency support needed?

---

**Status**: Analysis complete - ready for refactoring discussion!
