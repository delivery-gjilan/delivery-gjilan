# Settlements & Promotions

<!-- MDS:BL1 | Domain: Business Logic | Updated: 2026-03-19 -->
<!-- Depends-On: B2, B3, B6 -->
<!-- Depended-By: O3, O8, O11, M4 -->
<!-- Nav: Rule/promo changes → update O3 (Notifications campaigns), O8 (Testing preflight). Payment collection → update B2 (Order Creation), M4 (Mobile Audit). -->

## Recent Updates

- 2026-03-20: Added DB-level pending-settlement uniqueness guard (`uq_settlements_pending_fingerprint`) plus conflict-safe inserts in `FinancialService.createOrderSettlements()` to hard-stop occasional duplicate pending rows under concurrent triggers.
- 2026-03-19: Settlement creation is now protected by an order-scoped Postgres advisory transaction lock in `FinancialService.createOrderSettlements()` to prevent duplicate settlements during concurrent delivery/backfill triggers.
- 2026-03-18: Fixed mobile-admin settlement action wiring to pass `settlementId` (not `id`) to `markSettlementAsPaid`.
- 2026-03-18: Fixed mobile-admin settlement list metadata line to show `createdAt` instead of undefined `periodStart`/`periodEnd` fields.
- 2026-03-18: Admin financial settlements page now supports aggregate-only settling from a bottom action row (full or partial across pending settlements in current scope); single-settlement settle actions were intentionally disabled in the details modal.
- 2026-03-18: Admin settlements aggregate action row is now shown only when viewing a specific business/driver scope (not on all-groups list), and a page-level search input was added in the header.
- 2026-03-18: Admin settlement details now show date-time (not date-only) and include per-settlement order context with businesses/items and delivery-fee visibility (with explicit driver-context label in driver view).

## How Settlements Work

Every delivered order creates **settlement records** that say who owes who and how much. There are only two parties that settle with the platform:

- **Businesses** — the restaurants / shops that supply products
- **Drivers** — the people who deliver orders

Each settlement has a **direction** from the platform's point of view:

| Direction | Meaning | Example |
|-----------|---------|---------|
| `RECEIVABLE` | They owe us | 10% commission on subtotal |
| `PAYABLE` | We owe them | €2 delivery compensation |

The `amount` is always positive. Direction tells you which way money flows.

### Settlement Lifecycle

```
PENDING  →  PAID        (normal payout)
PENDING  →  OVERDUE     (past due)
PENDING  →  CANCELLED   (order cancelled)
PENDING  →  DISPUTED    (contested)
PAID     →  PENDING     (reversed / unsettled)
```

### Database: `settlements`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `type` | `DRIVER` \| `BUSINESS` | Who this settlement involves |
| `direction` | `RECEIVABLE` \| `PAYABLE` | Money flow direction |
| `driver_id` | UUID (nullable) | FK → drivers |
| `business_id` | UUID (nullable) | FK → businesses |
| `order_id` | UUID | FK → orders (cascade) |
| `rule_id` | UUID (nullable) | FK → settlement_rules (the rule that created it) |
| `amount` | numeric(10,2) | Always positive, in EUR |
| `currency` | varchar, default `EUR` | |
| `status` | `PENDING` \| `PAID` \| `OVERDUE` \| `DISPUTED` \| `CANCELLED` | |
| `paid_at` | timestamp | When marked paid |
| `payment_reference` | varchar(100) | External reference (bank transfer ID, etc.) |
| `payment_method` | varchar(50) | How it was paid |

---

## Settlement Rules

Rules define the formulas used to create settlements. They are configured in the admin panel under **Financial → Settlement Rules**.

A rule says: _"For every matching order, create a settlement of X between the platform and a driver/business."_

### Database: `settlement_rules`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `name` | varchar(200) | Human label, e.g. "10% commission on subtotal" |
| `entity_type` | `DRIVER` \| `BUSINESS` | Who this rule creates settlements for |
| `direction` | `RECEIVABLE` \| `PAYABLE` | From the platform's POV |
| `amount_type` | `FIXED` \| `PERCENT` | How to calculate the amount |
| `amount` | numeric(10,2) | EUR if FIXED, percentage (0–100) if PERCENT |
| `applies_to` | `SUBTOTAL` \| `DELIVERY_FEE` | Base for PERCENT rules (ignored for FIXED) |
| `business_id` | UUID (nullable) | Scoped to a specific business (null = all) |
| `promotion_id` | UUID (nullable) | Scoped to a specific promotion (null = all) |
| `is_active` | boolean | Only active rules are applied |
| `notes` | varchar(500) | Internal notes |

### Scoping

Rules can be targeted:

| `business_id` | `promotion_id` | Scope |
|:-:|:-:|---|
| null | null | **Global** — applies to every order |
| set | null | Only orders from that business |
| null | set | Only orders that used that promotion |
| set | set | Only orders from that business AND using that promotion |

### Amount Calculation

- **FIXED**: settlement amount = `rule.amount` (flat EUR per order)
- **PERCENT**: settlement amount = `base × rule.amount / 100`
  - If `applies_to = SUBTOTAL` → base = `order.price` (the items total)
  - If `applies_to = DELIVERY_FEE` → base = `order.deliveryPrice`

### Automatic Markup Remittance (Platform ↔ Driver)

Besides rule-based settlements, the system now creates one automatic driver settlement when markup earnings exist on an order and a driver is assigned.

- Settlement type: `DRIVER`
- Direction: `RECEIVABLE`
- Meaning: driver owes the platform markup earnings collected from the customer
- Rule linkage: `rule_id = null` (system-generated, not from admin rules)

Markup earnings are calculated from order item price snapshots:

`sum(max(0, final_applied_price - base_price) × quantity)`

This automatic markup remittance is only created for orders where payment collection is `CASH_TO_DRIVER`.
For `PREPAID_TO_PLATFORM`, no driver remittance settlement is created for markup because the platform already collected funds directly.

This keeps platform markup earnings explicit in settlements without requiring an admin-configured settlement rule.

### Examples

| Name | Entity | Direction | Amount | Applies To | Scope |
|------|--------|-----------|--------|------------|-------|
| 10% business commission | BUSINESS | RECEIVABLE | 10% | SUBTOTAL | Global |
| Driver delivery fee share | DRIVER | PAYABLE | 80% | DELIVERY_FEE | Global |
| Free delivery driver compensation | DRIVER | PAYABLE | €2.00 | — | Promo: FREE_DELIVERY |
| Premium restaurant fee | BUSINESS | RECEIVABLE | 15% | SUBTOTAL | Business: Sushi Place |

---

## How Settlement Creation Works

When an order is delivered, the `FinancialService.createOrderSettlements()` method runs:

```
1. Acquire an order-scoped advisory transaction lock (`pg_advisory_xact_lock(hashtext(orderId))`)
2. Check if settlements already exist for this order (idempotent guard under lock)
2. SettlementCalculationEngine runs:
   a. Collect business IDs from the order's products
   b. Collect promotion IDs from the order_promotions table
   c. Query all active rules that match:
      - Global rules (business_id IS NULL AND promotion_id IS NULL)
      - Business-scoped rules (business_id matches one of the order's businesses)
      - Promotion-scoped rules (promotion_id matches one of the order's promotions)
   d. For each matching rule:
      - Calculate amount (FIXED or PERCENT)
      - Skip DRIVER rules if no driver assigned
      - For global BUSINESS rules: create one settlement per business in the order
   e. If a driver is assigned, order payment collection is CASH_TO_DRIVER, and markup earnings are positive:
      - Create automatic `DRIVER / RECEIVABLE` settlement for markup remittance
      - Set `rule_id` to null (system-generated entry)
   f. Return SettlementCalculation[]
3. For each calculation, persist a settlement record (status = PENDING) in the same transaction
```

### Payment Collection Modes

Orders track how customer payment is collected:

- `CASH_TO_DRIVER`: Driver collects cash from customer
- `PREPAID_TO_PLATFORM`: Platform collects payment directly (e.g., card)

This mode affects automatic markup remittance behavior.

### Order Cancellation

`FinancialService.cancelOrderSettlements(orderId)` deletes all `PENDING` settlements for that order. Already `PAID` settlements are kept — those need manual handling.

---

## Promotions

Promotions are a separate discount system. They reduce what the customer pays.

### Database: `promotions`

Key fields:

| Field | Purpose |
|-------|---------|
| `type` | `FIXED_AMOUNT`, `PERCENTAGE`, `FREE_DELIVERY`, `SPEND_X_GET_FREE`, `SPEND_X_PERCENT`, `SPEND_X_FIXED` |
| `code` | Promo code the customer enters (or null for auto-apply) |
| `discount_value` | The discount amount or percentage |
| `min_order_amount` | Minimum order total to qualify |
| `max_discount_amount` | Cap on the discount |
| `target` | `ALL_USERS`, `SPECIFIC_USERS`, `FIRST_ORDER`, `CONDITIONAL` |
| `auto_apply` | Whether it applies automatically without a code |
| `is_stackable` | Whether it can combine with other promos |
| `usage_limit` / `per_user_limit` | Usage caps |
| `valid_from` / `valid_until` | Date window |
| `created_by_type` | `PLATFORM` or `BUSINESS` |
| `business_id` | If business-created, which business owns it |

### Database: `order_promotions`

Links orders to applied promotions:

| Field | Purpose |
|-------|---------|
| `order_id` | FK → orders |
| `promotion_id` | FK → promotions |
| `applies_to` | `PRICE` (items discount) or `DELIVERY` (delivery discount) |
| `discount_amount` | Actual discount applied |

### Related Tables

| Table | Purpose |
|-------|---------|
| `user_promotions` | Assigns promos to specific users, tracks per-user usage |
| `promotion_usage` | Full redemption log (who used what, on which order, discount amount) |
| `promotion_business_eligibility` | Restricts a promo to specific businesses |
| `user_promo_metadata` | Per-user stats: first order promo used, total savings |

---

## How Promotions Connect to Settlements

Promotions affect settlements in two ways:

### 1. Promotion-scoped settlement rules

You can create a settlement rule with a `promotion_id`. This rule only fires for orders that used that promotion. Common use case: when a promotion gives free delivery, you still want to compensate the driver — so you create a `DRIVER / PAYABLE / FIXED €2.00` rule scoped to that free delivery promotion.

### 2. Promotions change the order totals

Promotions reduce `order.price` (item discounts) or `order.deliveryPrice` (delivery discounts). Since PERCENT settlement rules calculate against these values, the settlement amounts naturally adjust. If a customer gets 20% off items, the business commission (which is a % of subtotal) is also lower.

---

## Admin Panel

### Settlement Rules (`/admin/financial/rules`)

- Tabbed view: Business rules / Driver rules
- Create, activate/deactivate, delete rules
- Form: name, entity type, direction, amount type, amount, applies-to, business scope, promotion scope, notes

### Finances Dashboard (`/dashboard/finances`)

- Toggle between Drivers / Businesses view
- Date filters (All, Today, This Month, Custom range)
- Summary cards: Total Earned, Pending, Paid
- Grouped by driver/business with expand for individual settlements
- Actions: Settle All, Partial Settle, Unsettle

### Settlement Testing Page (`/admin/financial/testing`)

- Deterministic scenario harness with run buttons
- Run one scenario or all scenarios
- Shows PASS/FAIL and expected-vs-actual settlement diff
- Uses seeded data and fixed IDs to keep results reproducible
- Includes business-sponsored free-delivery variants (full reimburse, split reimburse, prepaid)
- Includes scenario builder UI to preview expected flows and rule setup guidance

### API Preflight Suite

- Run: `npm run test:api:preflight` in `api/`
- This gate now runs:
   - settlement harness scenarios
   - order-creation checks (payment collection defaults/explicit modes, delivery and total validation, invalid promo rejection)
- Use `npm run dev:preflight` to run preflight before API boot.
- Use `npm run dev` for fast startup without preflight.

---

## GraphQL API

### Settlement Queries

```graphql
settlements(type, status, direction, driverId, businessId, startDate, endDate, limit, offset): [Settlement!]!
settlementSummary(type, driverId, businessId, startDate, endDate): SettlementSummary!
driverBalance(driverId: ID!): SettlementSummary!
businessBalance(businessId: ID!): SettlementSummary!
settlementScenarioDefinitions: [SettlementScenarioDefinition!]!
```

### Settlement Mutations

```graphql
markSettlementAsPaid(settlementId, paymentReference, paymentMethod): Settlement!
markSettlementsAsPaid(ids, paymentReference, paymentMethod): [Settlement!]!
markSettlementAsPartiallyPaid(settlementId, amount): Settlement!
unsettleSettlement(settlementId): Settlement!
backfillSettlementsForDeliveredOrders: Int!
runSettlementScenarioHarness(scenarioIds: [String!]): SettlementScenarioHarnessResult!
```

### Settlement Rule Queries & Mutations

```graphql
settlementRule(id: ID!): SettlementRule
settlementRules(filter: { entityType, businessId, promotionId, isActive }): [SettlementRule!]!
createSettlementRule(input: CreateSettlementRuleInput!): SettlementRule!
updateSettlementRule(id: ID!, input: UpdateSettlementRuleInput!): SettlementRule!
deleteSettlementRule(id: ID!): Boolean!
```

### Promotion Queries & Mutations

```graphql
getAllPromotions(isActive, type, target, businessId): [Promotion!]!
getPromotion(id: ID!): Promotion
getApplicablePromotions(userId, cartContext): [ApplicablePromotion!]!
validatePromotions(userId, promotionIds, cartContext): PromotionResult!
createPromotion(input: CreatePromotionInput!): Promotion!
updatePromotion(id: ID!, input: UpdatePromotionInput!): Promotion!
deletePromotion(id: ID!): Boolean!
```

---

## Key Files

| File | Purpose |
|------|---------|
| `api/database/schema/settlements.ts` | Settlements table + relations |
| `api/database/schema/settlementRules.ts` | Settlement rules table + relations + shared enums |
| `api/database/schema/orders.ts` | Order schema, including payment collection mode |
| `api/database/schema/promotions.ts` | Promotions + user_promotions + usage + eligibility tables |
| `api/database/schema/orderPromotions.ts` | Order ↔ promotion link table |
| `api/src/models/Order/Order.graphql` | Order GraphQL schema and create-order input |
| `api/src/services/SettlementCalculationEngine.ts` | Matches rules to orders, calculates amounts |
| `api/src/services/FinancialService.ts` | Orchestrates settlement creation/cancellation |
| `api/src/repositories/SettlementRepository.ts` | Settlement CRUD, pay/unsettle, summaries |
| `api/src/repositories/SettlementRuleRepository.ts` | Rule CRUD |
| `api/src/models/Settlement/Settlement.graphql` | Settlement GraphQL schema |
| `api/src/services/SettlementScenarioHarnessService.ts` | Seed + scenario execution + expected/actual comparison |
| `api/src/models/SettlementRule/SettlementRule.graphql` | Settlement rule GraphQL schema |
| `api/src/models/Promotion/Promotion.graphql` | Promotion GraphQL schema |
| `admin-panel/src/app/admin/financial/rules/page.tsx` | Admin settlement rules UI |
| `admin-panel/src/app/admin/financial/testing/page.tsx` | Admin settlement scenario testing harness UI |
| `admin-panel/src/app/dashboard/finances/page.tsx` | Admin finances dashboard |
