# Settlement Request Flow

## Overview

Settlement requests are the mechanism by which the admin platform collects payments from businesses and drivers. The flow is:

1. **Admin creates a request** via the admin panel (or API)
2. **Business/Driver receives a push notification** asking them to review
3. **Entity approves or disputes** the request from their mobile app
4. **If approved**: a `SettlementPayment` is created, all unsettled settlements for that entity are marked as settled, and if the amount is less than the total balance a carry-forward settlement is created for the remainder
5. **If disputed**: admin is notified and can review/cancel the request

**No payment is created until the entity approves the request.**

---

## Database Schema

### `settlement_requests` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `entity_type` | ENUM (DRIVER, BUSINESS) | Who this request targets |
| `business_id` | UUID (nullable) | FK to businesses (for BUSINESS requests) |
| `driver_id` | UUID (nullable) | FK to drivers (for DRIVER requests) |
| `requested_by_user_id` | UUID | Admin who created the request |
| `amount` | NUMERIC(10,2) | Amount being requested |
| `currency` | VARCHAR(3) | Default 'EUR' |
| `period_start` | TIMESTAMP | Start of the period covered |
| `period_end` | TIMESTAMP | End of the period covered |
| `note` | TEXT | Optional message from admin |
| `status` | ENUM | PENDING_APPROVAL, ACCEPTED, DISPUTED, EXPIRED, CANCELLED |
| `responded_at` | TIMESTAMP | When the entity responded |
| `responded_by_user_id` | UUID | Who responded |
| `dispute_reason` | TEXT | Reason if disputed |
| `expires_at` | TIMESTAMP | Auto-expires after 48h by default |

### How settlements are linked

Settlements are **NOT directly linked** to settlement requests. When a request is accepted:
1. `SettlingService.settleWithBusiness()` or `settleWithDriver()` is called
2. This creates a `settlement_payments` record
3. All unsettled settlements for that entity are marked `is_settled = true` with `settlement_payment_id` pointing to the payment
4. If partial payment: a new carry-forward settlement is created with `source_payment_id`

---

## GraphQL API

### Mutations

#### `createSettlementRequest` (Admin only)

Creates a settlement request and sends a push notification to the entity.

```graphql
mutation CreateSettlementRequest(
  $businessId: ID      # Provide for BUSINESS requests
  $driverId: ID        # Provide for DRIVER requests (accepts user ID or driver record ID)
  $amount: Float!
  $periodStart: Date!
  $periodEnd: Date!
  $note: String
) {
  createSettlementRequest(
    businessId: $businessId
    driverId: $driverId
    amount: $amount
    periodStart: $periodStart
    periodEnd: $periodEnd
    note: $note
  ) {
    id
    entityType
    status
    amount
    currency
    periodStart
    periodEnd
    note
    expiresAt
    createdAt
  }
}
```

**Rules:**
- Exactly one of `businessId` or `driverId` must be provided (not both, not neither)
- `driverId` accepts either the driver record ID or the user ID (resolver handles lookup)
- Status starts as `PENDING_APPROVAL`
- Expires after 48 hours by default

**Sample request (business):**
```json
{
  "businessId": "abc-123-business-uuid",
  "amount": 150.50,
  "periodStart": "2026-03-01T00:00:00.000Z",
  "periodEnd": "2026-03-31T23:59:59.999Z",
  "note": "March commission settlement"
}
```

**Sample request (driver):**
```json
{
  "driverId": "def-456-user-or-driver-uuid",
  "amount": 45.00,
  "periodStart": "2026-04-01T00:00:00.000Z",
  "periodEnd": "2026-04-05T23:59:59.999Z",
  "note": "Weekly delivery settlement"
}
```

#### `respondToSettlementRequest` (Business/Driver/Admin)

The entity approves or disputes the request. **Only when accepted does a payment get created.**

```graphql
mutation RespondToSettlementRequest(
  $requestId: ID!
  $action: SettlementRequestAction!  # ACCEPT or DISPUTE
  $disputeReason: String             # Required when action is DISPUTE
) {
  respondToSettlementRequest(
    requestId: $requestId
    action: $action
    disputeReason: $disputeReason
  ) {
    id
    status
    respondedAt
    disputeReason
  }
}
```

**Roles allowed:**
- `BUSINESS_OWNER`, `BUSINESS_EMPLOYEE` (scoped to their own business)
- `DRIVER` (scoped to their own driver record)
- `ADMIN`, `SUPER_ADMIN`

**What happens on ACCEPT:**
1. `SettlingService.settleWithBusiness(businessId, requestedAmount, userId)` or `.settleWithDriver(driverId, userId, requestedAmount)` is called
2. All unsettled settlements for the entity are gathered
3. Net balance computed (RECEIVABLE - PAYABLE)
4. `settlement_payments` record created
5. All unsettled settlements marked `is_settled = true`
6. If amount < net balance: carry-forward settlement created for remainder
7. Request status set to `ACCEPTED`
8. Admin notified via push

**What happens on DISPUTE:**
1. Request status set to `DISPUTED`
2. `disputeReason` stored
3. Admin notified via push
4. No settlements are touched

**Sample accept:**
```json
{
  "requestId": "request-uuid-here",
  "action": "ACCEPT"
}
```

**Sample dispute:**
```json
{
  "requestId": "request-uuid-here",
  "action": "DISPUTE",
  "disputeReason": "The amount seems incorrect, I only delivered 3 orders this week"
}
```

#### `cancelSettlementRequest` (Admin only)

Cancel a pending request (only works on `PENDING_APPROVAL` status).

```graphql
mutation CancelSettlementRequest($requestId: ID!) {
  cancelSettlementRequest(requestId: $requestId) {
    id
    status
  }
}
```

### Queries

#### `settlementRequests`

List settlement requests with filters.

```graphql
query GetSettlementRequests(
  $businessId: ID
  $driverId: ID
  $entityType: SettlementType  # DRIVER or BUSINESS
  $status: SettlementRequestStatus
  $limit: Int
  $offset: Int
) {
  settlementRequests(
    businessId: $businessId
    driverId: $driverId
    entityType: $entityType
    status: $status
    limit: $limit
    offset: $offset
  ) {
    id
    entityType
    amount
    currency
    status
    periodStart
    periodEnd
    note
    expiresAt
    createdAt
    respondedAt
    disputeReason
    business { id name }
    driver { id firstName lastName }
    requestedBy { id firstName lastName }
    respondedBy { id firstName lastName }
  }
}
```

**Auto-scoping:**
- Business users automatically see only their own requests
- Driver users automatically see only their own requests
- Admins can filter by any businessId/driverId

#### `unsettledBalance`

Get the net unsettled balance for an entity before creating a request.

```graphql
query GetUnsettledBalance($entityType: SettlementType!, $entityId: ID!) {
  unsettledBalance(entityType: $entityType, entityId: $entityId)
}
```

Returns a `Float`:
- Positive = entity owes the platform (RECEIVABLE > PAYABLE)
- Negative = platform owes the entity (PAYABLE > RECEIVABLE)
- For drivers, `entityId` accepts either the user ID or driver record ID

---

## Mobile App Integration

### Business App (mobile-business)

1. **Listen for push notifications** with `type: 'SETTLEMENT_REQUEST'`
2. **Navigate to finances screen** when notification tapped
3. **Query pending requests:**
   ```graphql
   query {
     settlementRequests(status: PENDING_APPROVAL) {
       id entityType amount currency periodStart periodEnd note expiresAt
     }
   }
   ```
4. **Show request details** with Accept/Dispute buttons
5. **On Accept:** call `respondToSettlementRequest(requestId, action: ACCEPT)`
6. **On Dispute:** show textarea for reason, call `respondToSettlementRequest(requestId, action: DISPUTE, disputeReason: "...")`

### Driver App (mobile-driver)

Same flow as business app:
1. Listen for push with `type: 'SETTLEMENT_REQUEST'`
2. Query `settlementRequests(status: PENDING_APPROVAL)` (auto-scoped to driver)
3. Show Accept/Dispute UI
4. Call `respondToSettlementRequest` with appropriate action

---

## DB Migration

Run the SQL in `api/database/extend-settlement-requests-for-drivers.sql` to add driver support:

```sql
ALTER TABLE "settlement_requests" ALTER COLUMN "business_id" DROP NOT NULL;
ALTER TABLE "settlement_requests" ADD COLUMN "entity_type" "settlement_entity_type" NOT NULL DEFAULT 'BUSINESS';
ALTER TABLE "settlement_requests" ADD COLUMN "driver_id" uuid REFERENCES "drivers"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_settlement_requests_driver_id" ON "settlement_requests"("driver_id");
CREATE INDEX IF NOT EXISTS "idx_settlement_requests_entity_type" ON "settlement_requests"("entity_type");
```

---

## Driver ID Resolution

The `driverId` parameter in `createSettlementRequest`, `settleWithDriver`, and `unsettledBalance` all accept **either the user ID or the driver record ID**. The resolvers automatically look up the driver record by `userId` first; if found, they use the driver record ID. This means:

- The admin panel (which shows drivers as User objects with user IDs) works without changes
- Mobile apps that have the driver record ID can also use it directly
- The `settlements` table stores `driver_id` (driver record ID, not user ID)
