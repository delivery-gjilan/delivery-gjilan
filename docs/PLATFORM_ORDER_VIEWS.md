# Platform Order Views

This document describes which order data each platform surface can access,
the GraphQL queries they use, and the field-visibility rules enforced by the API.

---

## Access control overview

All order queries require authentication. Role-based access is enforced in the
resolver layer; the service layer treats callers as already authorised.

| Role | Sees |
|---|---|
| `SUPER_ADMIN` / `ADMIN` | All orders, all fields |
| `DRIVER` | Own assigned orders (by `driverId`) |
| `CUSTOMER` | Own orders (by `userId`) |
| `BUSINESS_OWNER` / `BUSINESS_EMPLOYEE` | Orders containing items from their business |

---

## Shared queries

All roles share the same set of queries. The API returns a role-scoped subset.

### `orders(limit, offset)` → `[Order!]!`

| Role | What is returned |
|---|---|
| Admin | All orders with pagination |
| Driver | Orders where `driverId = me` |
| Customer | Orders where `userId = me` |
| Business | Orders containing products from `businessId = me` |

### `order(id)` → `Order`

Full order detail. Access rules:
- Customer: only if `order.userId = me`
- Business: only if the order contains items from their business, or a
  settlement references their business (historical edge-case)
- Driver / Admin: any order

Business users receive only the `businesses` entry for their own business;
all other businesses in the same order are stripped.

### `ordersByStatus(status)`, `uncompletedOrders`, `cancelledOrders`

Same role-scoped logic as `orders`.

---

## `Order` type — key fields

| Field | Description |
|---|---|
| `deliveryPrice` | Post-promotion delivery fee, **excluding** priority surcharge |
| `prioritySurcharge` | Priority delivery surcharge (0 if not a priority order) |
| `totalPrice` | `actualPrice + deliveryPrice + prioritySurcharge` — what the customer pays |
| `orderPrice` | Alias for `actualPrice` (legacy, kept for backward compatibility) |
| `businesses` | Items grouped by business; business users receive only their slice |

---

## Driver-specific

### Financial breakdown: `driverOrderFinancials(orderId)` → `DriverOrderFinancials`

Returns the financial breakdown for a specific order as seen by a driver.
Only accessible to `DRIVER` (for own orders) and `ADMIN` / `SUPER_ADMIN` (any order).

```graphql
type DriverOrderFinancials {
    orderId: ID!
    paymentCollection: OrderPaymentCollection!
    amountToCollectFromCustomer: Float!
    amountToRemitToPlatform: Float!
    driverNetEarnings: Float!
}
```

#### Calculations

**CASH_TO_DRIVER orders**
```
amountToCollectFromCustomer = totalPrice
amountToRemitToPlatform     = (sum of DRIVER RECEIVABLE settlements)
                            = markupPrice + prioritySurcharge + delivery commission share
driverNetEarnings           = amountToCollect - amountToRemit
```

**PREPAID_TO_PLATFORM orders**
```
amountToCollectFromCustomer = 0
amountToRemitToPlatform     = -(sum of DRIVER PAYABLE settlements)  [negative = owed TO driver]
driverNetEarnings           = 0 - amountToRemit  [positive = driver profit]
```

#### Pre-delivery vs post-delivery accuracy

| Order status | Source of `amountToRemit` |
|---|---|
| `DELIVERED` | Actual `settlements` rows — exact |
| Any other status | Estimated from `markupPrice + prioritySurcharge`; delivery commission is 0 until the settlement engine runs on delivery |

---

## Business-specific

Business users currently access orders through the shared `order` / `orders`
queries. The API automatically scopes the `businesses` field to only show items
belonging to the requesting business.

Fields especially relevant to business operators:
- `businesses[].items[].unitPrice` — the price at time of order (the amount the
  customer paid per item, which equals `businessPrice` per item for items with no markup)
- `orderPromotions` — promotions applied to this order (useful for understanding
  price reductions the business funded)

---

## Admin-specific

Admins receive the full `Order` object with no field restrictions.
The admin panel additionally uses the `settlements` and `settlementSummary` queries
(see `Settlement.graphql`) for financial management.

---

## Price column semantics reference

| DB column | GraphQL field | Meaning |
|---|---|---|
| `actual_price` | `orderPrice` (legacy) | What the customer pays for items, post-discount |
| `markup_price` | — (not exposed directly) | Platform margin embedded in `actualPrice` above `businessPrice` |
| `business_price` | — (used internally for settlements) | Sum of business base prices for all items |
| `delivery_price` | `deliveryPrice` | Post-promotion delivery fee, excl. priority surcharge |
| `original_delivery_price` | — (internal) | Delivery fee before any promotions |
| `priority_surcharge` | `prioritySurcharge` | Priority delivery surcharge (server-validated constant) |
| — | `totalPrice` | Derived: `actualPrice + deliveryPrice + prioritySurcharge` |

---

## Changing the priority surcharge amount

The surcharge is a server-authoritative constant defined in
`api/src/config/prioritySurcharge.ts`. The mobile client must first call
`prioritySurchargeAmount` to fetch the current value, then pass it back in
`CreateOrderInput.prioritySurcharge`. The server rejects any mismatch > €0.01.
