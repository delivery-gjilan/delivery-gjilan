# Settlement System

## Overview

Settlements track money movement per completed order between three parties:

- **Platform** (you) — operates the marketplace
- **Businesses** — supply the products
- **Drivers** — deliver the orders

Every DELIVERED order generates settlement records that break down exactly who owes whom and why. Every calculation is stored with a full audit trail so you can be transparent with drivers and businesses.

## Direction Semantics

Each settlement has a `direction`:

- **RECEIVABLE** — the entity owes the platform (e.g., platform commission from a business or driver)
- **PAYABLE** — the platform owes the entity (e.g., free-delivery driver compensation, vehicle bonus)

The `amount` is always positive. Direction tells you which way money flows.

## Status Lifecycle

```
PENDING  →  PAID        (normal payout)
PENDING  →  OVERDUE     (past due date)
PENDING  →  CANCELLED   (order cancelled before payout)
PENDING  →  DISPUTED    (contested by driver/business)
PAID     →  PENDING     (unsettled / reversed)
```

## Data Model

### settlements table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `type` | enum: `DRIVER`, `BUSINESS` | Who this settlement involves |
| `direction` | enum: `RECEIVABLE`, `PAYABLE` | Money flow direction |
| `driverId` | uuid (nullable) | FK to drivers |
| `businessId` | uuid (nullable) | FK to businesses |
| `orderId` | uuid | FK to orders (cascade delete) |
| `amount` | numeric(10,2) | Always positive |
| `currency` | varchar, default `EUR` | |
| `status` | enum: `PENDING`, `PAID`, `OVERDUE`, `DISPUTED`, `CANCELLED` | |
| `paidAt` | timestamp | When marked paid |
| `paidBy` | uuid | Admin who marked paid |
| `paymentReference` | varchar(100) | External payment ref |
| `paymentMethod` | varchar(50) | e.g., bank transfer, cash |
| `ruleSnapshot` | JSONB | Exact rule config at calculation time |
| `calculationDetails` | JSONB | Full calculation breakdown |
| `metadata` | JSONB | Coupons, bonuses, notes |
| `createdAt`, `updatedAt` | timestamp | Audit timestamps |

### settlement_rules table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `entityType` | enum: `DRIVER`, `BUSINESS` | Who this rule applies to |
| `entityId` | uuid | driver.id or business.id (or global ID) |
| `ruleType` | enum | See Rule Types below |
| `config` | JSONB | Type-specific configuration |
| `canStackWith` | JSONB array | Rule types that can stack |
| `priority` | integer | Lower = evaluated first |
| `isActive` | boolean | Only active rules apply |
| `activatedAt` | timestamp | When activated |
| `activatedBy` | uuid | Admin who activated |
| `notes` | varchar(500) | Admin notes |

## Rule Types

### For Businesses

| Rule Type | Config | Meaning |
|-----------|--------|---------|
| `PERCENTAGE` | `{ percentage, appliesTo: 'ORDER_SUBTOTAL' \| 'DELIVERY_FEE' }` | Platform takes this % from the business |
| `PRODUCT_MARKUP` | `{ appliesTo: 'PRODUCT_MARKUP', source: 'PRODUCT_PRICING_MARKUP' }` | Settlement uses per-product markup from product_pricing table |

### For Drivers

| Rule Type | Config | Meaning |
|-----------|--------|---------|
| `PERCENTAGE` | `{ percentage, appliesTo: 'DELIVERY_FEE' }` | Platform takes this % from the driver's delivery fee |
| `FIXED_PER_ORDER` | `{ amount, appliesTo: 'FREE_DELIVERY' }` | Platform pays driver this fixed amount per free-delivery order |
| `DRIVER_VEHICLE_BONUS` | `{ amount, condition: 'HAS_OWN_VEHICLE' }` | Platform pays driver extra if they use their own vehicle |

### Rule Config Auto-Sync

When admin updates a driver's commission percentage via `adminUpdateDriverSettings` or the deprecated `updateCommissionPercentage`, the system automatically creates or updates a `PERCENTAGE` settlement rule with `source: 'DRIVER_PROFILE_COMMISSION'`.

The same applies to businesses: updating business commission via `updateCommissionPercentage` auto-creates or updates a `PERCENTAGE` rule with `source: 'BUSINESS_PROFILE_COMMISSION'` on `ORDER_SUBTOTAL`.

## Rule Precedence and Stacking

### Precedence (who wins when multiple rules match)

Rules are resolved in this order:

1. **Specificity** (highest score wins)
   - Entity-specific + business-scoped override: **300**
   - Global + business-scoped override: **200**
   - Entity-specific: **100**
   - Global default: **10**

2. **Priority** — lower number wins (priority 10 beats priority 100)

3. **Tie-break** — older `updatedAt` wins

### Stacking

By default, only one rule wins per bucket. A bucket is defined by: `ruleType + appliesTo + businessScope`.

Two rules can stack ONLY when both rules explicitly allow each other via the `canStackWith` array. If rule A lists rule B's type in canStackWith AND rule B lists rule A's type, they both apply.

### Global Rules

Rules with `entityId = '00000000-0000-0000-0000-000000000000'` are global defaults. They apply to all entities of that type unless overridden by a more specific rule.

### Business Override

A rule can include `businessId` or `appliesToBusinessId` in its config to narrow it to a specific business context. This lets you keep a global default and override it for specific business partnerships.

## Calculation Flow

### When Settlements Are Created

Settlements are created when an order status transitions to `DELIVERED` (in `updateOrderStatus` resolver). The flow:

1. `updateOrderStatus` → calls `FinancialService.createOrderSettlements()`
2. `FinancialService` → checks no settlements exist yet → calls `SettlementCalculationEngine.calculateOrderSettlements()`
3. Engine groups items by business → calculates business settlement(s) → calculates driver settlement
4. Each calculated settlement is stored with `ruleSnapshot` and `calculationDetails`

### Business Settlement Calculation

For each business in the order:

1. Load active rules for this business (entity-specific + global)
2. Load product pricing for all items (businessPrice, platformMarkup)
3. Load active dynamic pricing overrides (FIXED_AMOUNT per-product)
4. Build items breakdown: per-item businessPrice, platformMarkup, customerPrice
5. **Product markup** (implicit): always applied — `platformMarkup * quantity` per item
6. **Dynamic pricing overrides**: FIXED_AMOUNT per-product overrides added as platform markup
7. Apply remaining rules (PERCENTAGE on ORDER_SUBTOTAL or DELIVERY_FEE)
8. Direction: always **RECEIVABLE** (platform collects from business)

### Driver Settlement Calculation (Normal Delivery)

1. Look up driver profile by userId
2. Load active rules for this driver
3. Apply each rule:
   - `PERCENTAGE` on `DELIVERY_FEE`: platform takes this %
   - `FIXED_PER_ORDER`: fixed amount (PAYABLE for driver, RECEIVABLE for business)
   - `DRIVER_VEHICLE_BONUS`: if `driver.hasOwnVehicle` is true, platform pays bonus
4. Net amount = totalReceivable - totalPayable
5. Direction: RECEIVABLE if net >= 0, PAYABLE if platform owes driver

### Driver Settlement Calculation (Free Delivery)

When delivery is free (coupon, promo), the driver still needs compensation:

1. Detect free delivery via order metadata or `originalDeliveryPrice > 0 && effectiveDeliveryPrice === 0`
2. Resolve the best compensation rule:
   - Prefer explicit `FREE_DELIVERY` rules over legacy `DELIVERY_FEE` percentage rules
   - Prefer promo-scoped rules when the matching promotion was applied
   - Fall back to general rules
3. Compute compensation:
   - `FIXED_PER_ORDER`: use the fixed amount
   - `PERCENTAGE`: calculate from original delivery fee
4. Direction: always **PAYABLE** (platform pays driver)
5. If no free-delivery rule exists: **skip gracefully** (log warning, no settlement created)

## Audit Trail

Every settlement stores two JSONB audit fields:

### ruleSnapshot

Captures the exact rule configuration at calculation time:

```json
{
  "appliedRules": [
    {
      "ruleId": "abc-123",
      "ruleType": "PERCENTAGE",
      "config": { "percentage": 15, "appliesTo": "ORDER_SUBTOTAL" },
      "activeSince": "2026-03-01T00:00:00Z",
      "capturedAt": "2026-03-15T14:30:00Z"
    }
  ]
}
```

### calculationDetails

Shows exactly HOW the amount was derived:

```json
{
  "orderSubtotal": 25.00,
  "itemsBreakdown": [
    {
      "productId": "prod-1",
      "quantity": 2,
      "businessPrice": 8.00,
      "platformMarkup": 2.00,
      "customerPrice": 10.00,
      "totalBusinessRevenue": 16.00,
      "totalPlatformMarkup": 4.00,
      "totalCustomerPaid": 20.00
    }
  ],
  "rulesApplied": [
    {
      "ruleType": "PRODUCT_MARKUP",
      "description": "Per-product platform markup",
      "baseAmount": 16.00,
      "amount": 4.00,
      "direction": "RECEIVABLE"
    },
    {
      "ruleType": "PERCENTAGE",
      "description": "15% commission on order subtotal",
      "baseAmount": 16.00,
      "percentage": 15,
      "amount": 2.40,
      "direction": "RECEIVABLE"
    }
  ],
  "totalReceivable": 6.40,
  "totalPayable": 0,
  "netAmount": 6.40,
  "currency": "EUR"
}
```

This breakdown lets you show any driver or business exactly which rules applied and how their settlement was calculated.

## Settlement Voiding (Order Cancellation)

When an order is cancelled via `cancelOrder`:

- `OrderService.cancelOrder()` calls `FinancialService.cancelOrderSettlements()`
- All **PENDING** settlements for that order are deleted
- **PAID** settlements are left intact (already disbursed — handle manually if reversal needed)

## Authorization

| Action | Required Role |
|--------|---------------|
| Create settlement rule | `ADMIN` or `SUPER_ADMIN` |
| Activate/deactivate rule | `ADMIN` or `SUPER_ADMIN` |
| Update/delete rule | `ADMIN` or `SUPER_ADMIN` |
| View settlements | Authenticated (drivers scoped to own) |
| Mark as paid / unsettle | `ADMIN` or `SUPER_ADMIN` |
| Update commission % | Authenticated (deprecated path) |

## Admin Scenarios (Ready-To-Go)

### 1. Driver Commission from Delivery Fee

- Rule: `DRIVER + PERCENTAGE`
- Config: `{ percentage: 15, appliesTo: 'DELIVERY_FEE' }`
- Meaning: Platform takes 15% from driver's delivery fee per order
- Scope: per-driver, or global with optional business override

### 2. Driver Compensation for Free-Delivery Orders

- Rule: `DRIVER + FIXED_PER_ORDER`
- Config: `{ amount: 2.00, appliesTo: 'FREE_DELIVERY' }`
- Meaning: Platform pays driver 2.00 EUR per free-delivery order
- Optional: `promotionId` in config to scope to a specific promotion

### 3. Driver Vehicle Bonus

- Rule: `DRIVER + DRIVER_VEHICLE_BONUS`
- Config: `{ amount: 1.50, condition: 'HAS_OWN_VEHICLE' }`
- Meaning: Platform pays driver 1.50 EUR extra per order when they use their own vehicle
- Requires: `hasOwnVehicle = true` on driver profile (set via admin settings)

### 4. Business Percentage Commission

- Rule: `BUSINESS + PERCENTAGE`
- Config: `{ percentage: 10, appliesTo: 'ORDER_SUBTOTAL' }`
- Meaning: Platform takes 10% from business order subtotal
- Also supports: `appliesTo: 'DELIVERY_FEE'`

### 5. Business Product Markup

- Rule: `BUSINESS + PRODUCT_MARKUP`
- Config: `{ appliesTo: 'PRODUCT_MARKUP', source: 'PRODUCT_PRICING_MARKUP' }`
- Meaning: Settlement uses per-product pricing markup (businessPrice vs customerPrice)
- The markup amount comes from `product_pricing` table, not from this rule

## Dynamic Pricing and Settlements

Dynamic pricing rules (`dynamic_pricing_rules` table) are primarily customer-price adjustments. Their interaction with settlements:

- **FIXED_AMOUNT** rules with per-product overrides: treated as additional platform markup during settlement. Business receives `businessPrice * quantity` as before. Platform receives `platformMarkup * quantity + overrideAmount * quantity`.
- **PERCENTAGE** and **MULTIPLIER** adjustments: do NOT currently affect settlement shares. If these should affect settlements, explicit split semantics need to be defined.
- Per-product overrides from multiple matching dynamic pricing rules are summed.

## Edge Cases

### No Rules Exist

- **Driver (normal delivery)**: No settlement created. Logged as `settlement:driver:no-rules`.
- **Driver (free delivery)**: No settlement created. Logged as `settlement:free-delivery:no-rule`.
- **Business**: No settlement created. Logged as `settlement:business:no-rules`.

This is safe — it means no financial obligation is recorded. The admin should configure rules before going live.

### Partial Payments

The `markSettlementAsPartiallyPaid` mutation splits a settlement:
- Original record: reduced to remaining amount, stays PENDING
- New record: paid portion, marked PAID with full audit trail preserved (direction, ruleSnapshot, calculationDetails, metadata copied)

### Multiple Businesses Per Order

If an order contains items from multiple businesses, each business gets its own settlement record. Items are grouped by business via the product's `businessId`.

## Key Files

| Component | Path |
|-----------|------|
| Calculation engine | `api/src/services/SettlementCalculationEngine.ts` |
| Financial service | `api/src/services/FinancialService.ts` |
| Settlement repository | `api/src/repositories/SettlementRepository.ts` |
| Settlement rule repository | `api/src/repositories/SettlementRuleRepository.ts` |
| Settlements DB schema | `api/database/schema/settlements.ts` |
| Settlement rules DB schema | `api/database/schema/settlementRules.ts` |
| Settlement GraphQL schema | `api/src/models/Settlement/Settlement.graphql` |
| Settlement rule GraphQL schema | `api/src/models/SettlementRule/SettlementRule.graphql` |
| Create rule mutation | `api/src/models/SettlementRule/resolvers/Mutation/createSettlementRule.ts` |
| Driver settings (commission sync) | `api/src/models/Driver/resolvers/Mutation/adminUpdateDriverSettings.ts` |
| Order delivery trigger | `api/src/models/Order/resolvers/Mutation/updateOrderStatus.ts` |
| Admin rules UI | `admin-panel/src/app/admin/financial/rules/page.tsx` |
| Admin dynamic pricing UI | `admin-panel/src/app/admin/financial/dynamic-pricing/page.tsx` |
