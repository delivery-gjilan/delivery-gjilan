# Settlements & Promotions

<!-- MDS:BL1 | Domain: Business Logic | Updated: 2026-04-06 -->
<!-- Depends-On: B2, B3, B6 -->
<!-- Depended-By: O3, O8, O11, M4 -->
<!-- Nav: Rule/promo changes → update O3 (Notifications campaigns), O8 (Testing preflight). Payment collection → update B2 (Order Creation), M4 (Mobile Audit). -->

## Recent Updates

- 2026-04-06: Compensation system matured — tracking switched from per-user to **per-order**. `promotions.order_id` column added (migration `0002_add_order_id_to_promotions.sql`); `IssueRecoveryPromotionInput` now requires `orderId`; service stores it on the promo row after creation; the Cancelled Orders page builds a `Set<orderId>` with a legacy fallback (extracts displayId from promo name for promos created before this column existed). `UserPromotion.user` field resolver implemented. Compensations tab on the Promotions page shows: reason, user name + phone, compensation value, usage state (pending/used), expiry. Issue Compensation modal includes a push notification section — toggle (on by default), pre-filled title + body, fires `sendPushNotification` for the user after the promo is issued. `refetchRecovery()` is now awaited before the modal auto-closes so the "Compensated" badge appears immediately.

- 2026-04-06: Recovery/compensation promotion system added. `issueRecoveryPromotion` mutation creates a hidden `SPECIFIC_USERS` promotion with `isRecovery = true`, `maxUsagePerUser = 1`, no promo code. Auto-applies at checkout via `PromotionEngine.checkUserAssignment()`. `getRecoveryPromotions` query (SUPER_ADMIN only) returns recovery promos with `assignedUsers { userId, usageCount, expiresAt, user { firstName, lastName, phoneNumber } }` and `orderId`. Admin Promotions page has a **Compensations** tab. Cancelled Orders page shows a green "Compensated" badge per order (not per user).

- 2026-04-04: `Business.activePromotion` resolver uses subquery-based eligibility (not INNER JOIN) so promotions with no `promotionBusinessEligibility` entries (global promos) appear on all business cards. `BusinessPromotion` type now includes `spendThreshold`. Mobile-customer cards use localized customer-friendly labels for all six promotion types.
- 2026-03-31: Priority surcharge (opt-in expedited delivery fee) is now stored as a separate `priority_surcharge` column on orders and automatically creates a `DRIVER / RECEIVABLE` settlement for cash orders (`rule_id = null`).
- 2026-03-31: Added business-funded promotion flow: `orders.business_price` column, business-funded item discounts stored as `businessPrice`, settlement rules skipped for business-funded item promos, ORDER_PRICE settlements use business-funded base when present, admin wizard exposes creator type toggle + business selector with settlement rules info box.
- 2026-03-25: Comprehensive doc refresh — added PromotionEngine service docs, stacking logic, progression bar (mobile-customer), corrected promotions table fields to match actual schema, added mobile-customer key files.
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
| `max_amount` | numeric(10,2) (nullable) | Cap for PERCENT rules; calculated amount is clamped to this ceiling |
| `applies_to` | `SUBTOTAL` \| `DELIVERY_FEE` | Base for PERCENT rules (ignored for FIXED) |
| `business_id` | UUID (nullable) | Scoped to a specific business (null = all) |
| `promotion_id` | UUID (nullable) | Scoped to a specific promotion (null = all) |
| `is_active` | boolean | Only active rules are applied |
| `is_deleted` | boolean | Soft-delete flag (default false). See `api/SOFT_DELETE_CONVENTION.md`. |
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
- **PERCENT**: settlement amount = `base × rule.amount / 100`, capped at `rule.max_amount` if set
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

### Automatic Priority Surcharge Remittance (Platform ↔ Driver)

When a customer pays a priority (expedited) delivery surcharge, a second automatic driver settlement is created.

- Settlement type: `DRIVER`
- Direction: `RECEIVABLE`
- Meaning: driver owes the platform the priority surcharge collected from the customer
- Rule linkage: `rule_id = null` (system-generated)
- Only applicable to `CASH_TO_DRIVER` orders — on `PREPAID_TO_PLATFORM` orders the platform already collected the surcharge directly

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
   f. If the order has `order_coverage_logs` with `fromStock > 0` (written at order creation):
      - Create `DRIVER / RECEIVABLE` stock remittance settlements — driver owes platform for items collected from operator stock
      - Category: `STOCK_REMITTANCE`; `rule_id` = null (system-generated)
      - Driver earnings screen shows this as a separate "Stock Item Remittance" line (purple cube icon)
   g. Return SettlementCalculation[]
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

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `code` | text (unique, nullable) | Promo code the customer enters (null = auto-applied / codeless) |
| `name` | text | Human label |
| `description` | text (nullable) | Optional description |
| `type` | enum | `FIXED_AMOUNT`, `PERCENTAGE`, `FREE_DELIVERY`, `SPEND_X_GET_FREE`, `SPEND_X_PERCENT`, `SPEND_X_FIXED` |
| `target` | enum | `ALL_USERS`, `SPECIFIC_USERS`, `FIRST_ORDER`, `CONDITIONAL` |
| `discount_value` | numeric(10,2) | The discount amount (EUR) or percentage (0–100) |
| `max_discount_cap` | numeric(10,2) | Cap on percentage discounts |
| `min_order_amount` | numeric(10,2) | Minimum subtotal to qualify |
| `spend_threshold` | numeric(10,2) | For conditional/SPEND_X_* promos: subtotal required to unlock |
| `threshold_reward` | jsonb | For SPEND_X_* promos: `{ type: 'FREE_DELIVERY' \| 'FIXED_AMOUNT' \| 'PERCENTAGE', value?: number }` |
| `max_global_usage` | integer | Total times this promo can be used globally |
| `max_usage_per_user` | integer | Times each user can use it |
| `current_global_usage` | integer | Counter incremented on each usage |
| `is_stackable` | boolean | Whether it can combine with other promos |
| `priority` | integer | Higher = applied first; controls stacking order |
| `is_active` | boolean | Only active promos are considered |
| `starts_at` | timestamp | Start of validity window |
| `ends_at` | timestamp | End of validity window |
| `total_revenue` | numeric(12,2) | Sum of order subtotals where this promo was used |
| `total_usage_count` | integer | Total redemptions |
| `creator_type` | enum | `PLATFORM` or `BUSINESS` |
| `creator_id` | UUID (nullable) | FK → businesses (null = platform-created) |
| `created_by` | UUID (nullable) | FK → users |

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

### Promotion application modes

- Promotions with a `code` are manual-entry promotions: the customer must enter the code in checkout to activate them.
- Promotions without a `code` are auto-applicable promotions: they are evaluated automatically when eligibility rules match.
- Recovery/compensation promotions are currently created without a code, assigned to specific users, and auto-applied only for those assigned users.
- The admin Promotions page includes a dedicated Promo Codes tab for group-style assignment (for example friends/VIP groups), where a code-based promotion is selected and assigned to chosen users in bulk.
- The Promo Codes tab also supports creating and assigning a new code promotion in one flow, including promo kind (fixed/percentage/free-delivery/spend-threshold), limits, stacking, priority, and driver payout for delivery-fee promotions.

### Recovery promo labels on customer UI

Recovery/compensation promotions can use internal names for operations (for example names prefixed with `[Recovery]`).
Customer-facing surfaces should present a clean label and strip internal recovery/compensation prefixes before rendering.
The mobile-customer cart auto-apply notifier presents recovery promotions as type-based labels (for example free-delivery compensation promo) instead of exposing internal naming prefixes.
The same notifier also normalizes regular promotion names/codes (removes technical prefixes/tokens) and falls back to friendly type labels when names are not customer-friendly.
On the mobile-customer business page, business-created active promotions are shown as a tappable promo card that opens an offer-details modal explaining how the promo applies, minimum spend (when present), and that the discount auto-applies at checkout.
Promotion descriptions can be edited from the admin Promotions edit modal and are shown in the business promo offer-details modal; when empty, the modal shows fallback explanatory copy.

### Business-funded promotions (item discounts)

- `creator_type = BUSINESS` + non-delivery promotions are treated as business-funded item discounts.
- Order creation stores the business-funded adjusted items total in `orders.business_price` (null when no business-funded promo); original item subtotal remains in `orders.base_price`.
- SettlementCalculationEngine uses `order.businessPrice ?? order.basePrice` when computing ORDER_PRICE settlements so business-funded discounts do not reduce platform-take calculations for platform-funded rules.
- PromotionService skips creating settlement rules for business-funded item promotions (non-delivery) to avoid double-charging the business.
- Admin panel promotion wizard surfaces a Platform/Business toggle and business selector; for business-funded item promos, the settlement rules step is replaced with an info box explaining settlements are skipped.

---

## How Promotions Connect to Settlements

Promotions affect settlements in two ways:

### 1. Promotion-scoped settlement rules

You can create a settlement rule with a `promotion_id`. This rule only fires for orders that used that promotion. Common use case: when a promotion gives free delivery, you still want to compensate the driver — so you create a `DRIVER / PAYABLE / FIXED €2.00` rule scoped to that free delivery promotion.

### 2. Promotions change the order totals

Promotions reduce `order.price` (item discounts) or `order.deliveryPrice` (delivery discounts). Since PERCENT settlement rules calculate against these values, the settlement amounts naturally adjust. If a customer gets 20% off items, the business commission (which is a % of subtotal) is also lower.

---

## PromotionEngine (Server-Side)

`api/src/services/PromotionEngine.ts` is the single service class for all promotion logic.

### `getApplicablePromotions(userId, cart, manualPromoCode?)`

Finds all eligible promotions:

1. Check user's first-order status via `user_promo_metadata`
2. Query all promotions that are: active, within time window (`startsAt`/`endsAt`), and meet `minOrderAmount`
3. If `manualPromoCode` is provided, filter to only that code
4. For each candidate, check target eligibility:
   - `ALL_USERS` → check code usage limits; if `spendThreshold` exists, also check threshold met
   - `FIRST_ORDER` → user must not have used a first-order promo before
   - `SPECIFIC_USERS` → user must have an active assignment in `user_promotions`
   - `CONDITIONAL` → cart subtotal must meet `spendThreshold`
5. Check business eligibility via `promotion_business_eligibility` (empty = global)
6. Check per-user and global usage limits
7. Calculate discount via `calculateDiscount()`
8. Sort by priority (highest first)

### `applyPromotions(userId, cart, manualPromoCode?)`

Selects the best combination and returns final totals:

1. Get applicable promotions from above
2. Always apply the first (highest priority) promotion
3. If first promo is stackable, add all remaining stackable promos
4. Sum total discount and check free delivery across all applied promos
5. Return `PromotionResult` with `finalSubtotal`, `finalDeliveryPrice`, `finalTotal`

When `manualPromoCode` is provided, manual-code matching is required; otherwise the result is empty.
Auto (code-less) promotions can still be included if compatible with the selected manual promotion.

### `applySelectedPromotions(userId, selectedPromotionIds, cart)`

Used by create-order to enforce the exact promotion set selected at checkout.

Flow:

1. De-duplicate selected IDs.
2. Verify each selected promotion remains applicable for the current cart.
3. Sort selected promotions by priority.
4. Apply stacking compatibility:
   - first promo is anchor
   - additional promos require both anchor and candidate to be stackable
   - second free-delivery promotion is rejected
5. Return authoritative final totals used by order creation.

### Discount Calculation by Type

| Type | Calculation | Notes |
|------|-------------|-------|
| `FIXED_AMOUNT` | `discountValue` | Flat EUR off subtotal |
| `PERCENTAGE` | `subtotal × discountValue / 100` | Capped by `maxDiscountCap` if set |
| `FREE_DELIVERY` | 0 (discount handled via `freeDelivery` flag) | Sets delivery to €0 |
| `SPEND_X_GET_FREE` | 0 (grants free delivery via `thresholdReward`) | Free item/delivery when threshold met |
| `SPEND_X_PERCENT` | `subtotal × discountValue / 100` | Percentage discount after threshold |
| `SPEND_X_FIXED` | `discountValue` | Fixed discount after threshold |

All discounts are capped at the subtotal (`min(discount, subtotal)`).

### Free Delivery Detection

A promo grants free delivery if:
- `type === 'FREE_DELIVERY'`, or
- `thresholdReward.type === 'FREE_DELIVERY'`

### Stacking Rules

- The first promo (highest priority) is always applied
- Additional promos are added only if the first promo is `isStackable = true` AND the candidate is also stackable
- Non-stackable promos are mutually exclusive with everything except themselves

### `recordUsage(promotionIds, userId, orderId, ...)`

Called after order creation:
- Locks each promotion row (`SELECT ... FOR UPDATE`) inside a transaction
- Re-validates usage limits under lock to prevent races
- Inserts `promotion_usage` records
- Increments `currentGlobalUsage`, `totalUsageCount`, `totalRevenue` on the promotion
- Updates `user_promotions.usageCount` and `user_promo_metadata.totalSavings`

### `reverseUsage(orderId, userId)`

Called on order cancellation:
- Deletes `promotion_usage` records for the order
- Decrements promotion and user metadata counters with `GREATEST(0, val - 1)`

---

## Business Card Promotion Badges

The `Business.activePromotion` field resolver (`api/src/models/Business/resolvers/Business.ts`) determines which promotion badge appears on each business card in mobile-customer.

### Resolver Logic

Returns the single highest-priority active promotion for a business:
1. Query promotions where `isActive = true`, `isDeleted = false`, within time window
2. Eligibility: promotion is either explicitly linked via `promotion_business_eligibility` OR has no eligibility entries (global promo applying to all businesses)
3. Order by `priority DESC`, limit 1
4. Returns `BusinessPromotion { id, name, description, type, discountValue, spendThreshold }`

### Customer-Facing Labels (mobile-customer)

`RestaurantCard` (full-size) shows localized labels with threshold info. `CompactRestaurantCard` (horizontal scroll) shows abbreviated labels.

| Type | RestaurantCard label (Albanian) | CompactRestaurantCard label |
|------|------|------|
| `PERCENTAGE` | `-20% Zbritje` | `-20% Zbritje` |
| `FIXED_AMOUNT` | `-€2.00 Zbritje` | `-€2.00 Zbritje` |
| `FREE_DELIVERY` | `Transporti Falas` | `Transporti Falas` |
| `SPEND_X_GET_FREE` | `Transport Falas mbi €15` | `Transporti Falas` |
| `SPEND_X_PERCENT` | `-20% mbi €15` | `-20% Zbritje` |
| `SPEND_X_FIXED` | `-€2.00 mbi €15` | `-€2.00 Zbritje` |

### Key Files

| File | Purpose |
|------|---------|
| `api/src/models/Business/resolvers/Business.ts` | `activePromotion` field resolver |
| `api/src/models/Business/Business.graphql` | `BusinessPromotion` type definition |
| `mobile-customer/modules/business/components/RestaurantCard.tsx` | Full business card with promotion badge |
| `mobile-customer/modules/business/components/CompactRestaurantCard.tsx` | Compact card with abbreviated badge |
| `mobile-customer/localization/schema.ts` | Locale keys: `business.item_discount`, `flat_discount`, `free_delivery`, `free_delivery_over`, `percent_off_over`, `flat_off_over` |

---

## Mobile-Customer: Progression Bar & Auto-Apply

The mobile-customer cart screen (`modules/cart/components/CartScreen.tsx`) implements a spend-threshold progression bar and automatic promotion application.

### Progression Bar

1. **Query**: `GET_PROMOTION_THRESHOLDS` is executed with the current cart context (items, subtotal, deliveryPrice, businessIds)
2. **API response**: Returns `PromotionThreshold[]` — active promotions with a `spendThreshold` (target = `CONDITIONAL` or `ALL_USERS` with threshold)
3. **Filtering**: Frontend filters thresholds by business eligibility — if `eligibleBusinessIds` is empty, the promo is global
4. **Selection**: Picks the highest-priority matching threshold
5. **Progress calculation**:
   - `progress = min(cartSubtotal / spendThreshold, 1)`
   - `amountRemaining = max(0, spendThreshold - cartSubtotal)`
6. **Display**: An animated bar shown when `0 < progress < 1` and no promo is already applied
   - Text: _"Spend €{threshold} to unlock: {promo name}"_ with remaining amount
   - Animated width: `{progress × 100}%`

### Auto-Apply

When the cart subtotal reaches or exceeds the spend threshold (`progress >= 1`):

1. Triggers `VALIDATE_PROMOTIONS` query (without `manualCode`, so server applies auto-eligible promos)
2. If a promo is returned, sets `promoResult` state with discount details
3. Fills the promo code input with the applied code
4. Shows a success notifier: _"Promotion applied: {name}"_
5. Tracks via `autoAppliedPromotionIdRef` to prevent re-triggering

### Auto-Remove

If the user decreases cart items so the subtotal drops below the threshold (`progress < 1`) and the promo was auto-applied, the promo is automatically cleared.

### Manual Code Entry

Step 3 (Review) includes a promo code input:
1. User types a code and taps "Apply"
2. `VALIDATE_PROMOTIONS` query with `manualCode` param
3. If valid → sets `promoResult`, shows success notification
4. If invalid → shows error: _"Promotion not valid."_
5. Clearing the input clears the applied promo

### Price Breakdown at Checkout

```
Subtotal = sum of all cart items (including option extras)
Delivery = base delivery price (or €0 if free delivery promo)
Priority = +€1.50 if priority delivery selected
Discount = total promo discount amount

Final Total = Subtotal + Delivery + Priority - Discount
```

### Order Submission

`createOrder` accepts `promotionIds` (and legacy `promotionId`).
The backend re-validates selected promotions via `PromotionEngine.applySelectedPromotions()`, then records usage and persists `order_promotions` rows.

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
getAllPromotions(isActive: Boolean): [Promotion!]!
getPromotion(id: ID!): Promotion
getApplicablePromotions(cart: CartContextInput!, manualCode: String): [ApplicablePromotion!]!
getPromotionThresholds(cart: CartContextInput!): [PromotionThreshold!]!
validatePromotions(cart: CartContextInput!, manualCode: String): PromotionResult!
getUserPromotions(userId: ID!): [UserPromotion!]!
getPromotionUsage(promotionId: ID!): [PromotionUsage!]!
getUserPromoMetadata(userId: ID!): UserPromoMetadata
getPromotionAnalytics(promotionId: ID!): PromotionAnalyticsResult
createPromotion(input: CreatePromotionInput!): Promotion!
updatePromotion(id: ID!, input: UpdatePromotionInput!): Promotion!
deletePromotion(id: ID!): Boolean!
assignPromotionToUsers(input: AssignPromotionToUserInput!): [UserPromotion!]!
removeUserFromPromotion(promotionId: ID!, userId: ID!): Boolean!
markFirstOrderUsed(userId: ID!): Boolean!
```

---

## Key Files

| File | Purpose |
|------|---------|
| **API — Schema** | |
| `api/database/schema/settlements.ts` | Settlements table + relations |
| `api/database/schema/settlementRules.ts` | Settlement rules table + relations + shared enums |
| `api/database/schema/orders.ts` | Order schema, including payment collection mode |
| `api/database/schema/promotions.ts` | Promotions + user_promotions + usage + eligibility tables |
| `api/database/schema/orderPromotions.ts` | Order ↔ promotion link table |
| **API — Services** | |
| `api/src/services/SettlementCalculationEngine.ts` | Matches rules to orders, calculates amounts |
| `api/src/services/FinancialService.ts` | Orchestrates settlement creation/cancellation |
| `api/src/services/PromotionEngine.ts` | Promotion eligibility, stacking, discount calculation, usage tracking |
| **API — Repositories** | |
| `api/src/repositories/SettlementRepository.ts` | Settlement CRUD, pay/unsettle, summaries |
| `api/src/repositories/SettlementRuleRepository.ts` | Rule CRUD |
| **API — GraphQL** | |
| `api/src/models/Order/Order.graphql` | Order GraphQL schema and create-order input |
| `api/src/models/Settlement/Settlement.graphql` | Settlement GraphQL schema |
| `api/src/models/SettlementRule/SettlementRule.graphql` | Settlement rule GraphQL schema |
| `api/src/models/Promotion/Promotion.graphql` | Promotion GraphQL schema (types, inputs, queries, mutations) |
| `api/src/models/Promotion/resolvers/Query/getPromotionThresholds.ts` | Threshold query for progression bar |
| `api/src/models/Promotion/resolvers/Query/validatePromotions.ts` | Validate & apply promotions resolver |
| `api/src/models/Promotion/resolvers/Query/getApplicablePromotions.ts` | List applicable promotions resolver |
| **API — Testing** | |
| `api/src/services/SettlementScenarioHarnessService.ts` | Seed + scenario execution + expected/actual comparison |
| **Admin Panel** | |
| `admin-panel/src/app/admin/financial/rules/page.tsx` | Admin settlement rules UI |
| `admin-panel/src/app/admin/financial/testing/page.tsx` | Admin settlement scenario testing harness UI |
| `admin-panel/src/app/dashboard/finances/page.tsx` | Admin finances dashboard |
| **Mobile Customer** | |
| `mobile-customer/modules/cart/components/CartScreen.tsx` | Cart + checkout with progression bar, promo code, auto-apply |
| `mobile-customer/modules/cart/hooks/useCreateOrder.ts` | Order creation hook (passes `promoCode`) |
| `mobile-customer/graphql/operations/promotions.ts` | `VALIDATE_PROMOTIONS` + `GET_PROMOTION_THRESHOLDS` queries |
| `mobile-customer/components/PromoSlider.tsx` | Promotional banner carousel on home screen |
