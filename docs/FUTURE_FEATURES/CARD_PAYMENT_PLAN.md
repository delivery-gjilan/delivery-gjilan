# Card Payment Implementation Plan

## Current State

- All orders default to `CASH_TO_DRIVER` — the driver collects cash from the customer at dropoff.
- The `PREPAID_TO_PLATFORM` enum value exists in the orders schema but has no payment gateway backing it.
- The settlement engine already branches on `paymentCollection` — markup/surcharge remittance is skipped for `PREPAID_TO_PLATFORM` because the platform holds the funds directly.
- GraphQL mutations (`settleWithBusiness`, `settleWithDriver`) accept `paymentMethod` and `paymentReference` but the `SettlingService` discards them (params prefixed with `_`).
- The `settlement_payments` table has no columns for payment method or processor references.
- No refund or chargeback logic exists.

## Architecture Principle

The settlement engine is payment-method-agnostic. Commission rules, carry-forward logic, and payout flows work identically regardless of how the customer paid. The work is primarily in two areas:

1. **Customer-facing payment collection** (new layer)
2. **Persisting payment metadata** (small schema additions to existing tables)

---

## Phase 1 — Schema Preparation

**Goal:** Add the columns needed to track payment metadata. No behavioral changes, no breaking changes.

### Orders table

Add to `api/database/schema/orders.ts`:

| Column | Type | Purpose |
|--------|------|---------|
| `paymentStatus` | enum (`PENDING`, `CAPTURED`, `FAILED`, `REFUNDED`) | Tracks whether the payment processor confirmed the charge |
| `processorPaymentId` | varchar(255), nullable | The Stripe PaymentIntent ID (or equivalent) for this order |

### Settlement payments table

Add to `api/database/schema/settlementPayments.ts`:

| Column | Type | Purpose |
|--------|------|---------|
| `paymentMethod` | varchar(50), nullable | e.g. `CASH`, `BANK_TRANSFER`, `STRIPE` |
| `paymentReference` | varchar(255), nullable | External transaction reference for audit |

### Code changes

- Remove the `_` prefix from `_paymentMethod` / `_paymentReference` in `SettlingService.settleWithDriver()` and `settleWithBusiness()`, persist them into the new columns.
- Update `SettlementPayment` resolvers to read from DB instead of returning hardcoded `null`.

### Migration

One Drizzle migration covering both table alterations.

---

## Phase 2 — Payment Gateway Integration

**Goal:** Accept card payments from customers at checkout via Stripe (or chosen processor).

### New service: `PaymentService`

Location: `api/src/services/PaymentService.ts`

Responsibilities:
- `createPaymentIntent(orderId, amount, currency)` — creates a Stripe PaymentIntent and returns the client secret
- `confirmPayment(paymentIntentId)` — called by webhook handler when Stripe confirms success
- `refundPayment(paymentIntentId, amount?)` — initiates a full or partial refund
- `getPaymentStatus(paymentIntentId)` — queries Stripe for current status

### Webhook endpoint

Location: `api/src/routes/stripeWebhook.ts`

- POST `/webhooks/stripe` — receives Stripe webhook events
- Verify webhook signature using Stripe SDK
- Handle events:
  - `payment_intent.succeeded` → update order `paymentStatus` to `CAPTURED`, proceed with order flow
  - `payment_intent.payment_failed` → update order `paymentStatus` to `FAILED`, cancel order
  - `charge.dispute.created` → flag order for manual review
  - `charge.refunded` → update order `paymentStatus` to `REFUNDED`

### Order creation flow changes

Current flow:
1. Customer submits order → order created with status `PENDING`

New flow for card orders:
1. Customer selects card payment → frontend calls `createPaymentIntent` mutation
2. API creates order with `paymentStatus: PENDING`, `paymentCollection: PREPAID_TO_PLATFORM`
3. API returns `clientSecret` to the mobile app
4. Mobile app presents Stripe payment sheet / card form
5. Stripe webhook confirms payment → API sets `paymentStatus: CAPTURED` and transitions order to normal flow
6. If payment fails → API cancels the order

### Environment config

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (returned to clients via a config query)

---

## Phase 3 — Mobile App Changes

**Goal:** Let customers choose between cash and card at checkout.

### mobile-customer

- Add a payment method selector to the checkout screen (cash / card)
- When card is selected:
  - Call `createPaymentIntent` mutation
  - Use `@stripe/stripe-react-native` to present the payment sheet
  - Handle success → show order confirmation
  - Handle failure → show error, allow retry
- When cash is selected → existing flow unchanged

### mobile-business / mobile-driver

- Display the payment method on the order card (`Cash` vs `Card — Paid`)
- Driver app: if card order, no cash collection prompt at dropoff

### admin-panel

- Show payment method and status on order detail views
- Show `processorPaymentId` for card orders as a link to the Stripe dashboard

---

## Phase 4 — Refund Support

**Goal:** Allow admins to issue refunds for card orders.

### GraphQL mutation

```graphql
mutation RefundOrder($orderId: ID!, $amount: Float, $reason: String) {
    refundOrder(orderId: $orderId, amount: $amount, reason: $reason) {
        success
        refundId
        refundedAmount
    }
}
```

### Logic

- Only applicable when `paymentCollection = PREPAID_TO_PLATFORM` and `paymentStatus = CAPTURED`
- Full refund (default) or partial refund (if `amount` provided)
- Calls `PaymentService.refundPayment()`
- Updates order `paymentStatus` to `REFUNDED`
- Cancels any pending settlements for the order via `FinancialService.cancelOrderSettlements()`
- Creates an audit log entry

---

## Phase 5 — Settlement Payout Automation (Optional)

**Goal:** Automate business/driver payouts instead of manual cash/bank settlement.

This phase is only relevant if you want to pay businesses and drivers through Stripe Connect (or similar) instead of manually.

### Option A — Stripe Connect

- Businesses and drivers onboard as Stripe Connected Accounts
- When `settleWithBusiness` is called, instead of recording a manual payment, initiate a Stripe Transfer to the connected account
- `paymentMethod` on `settlement_payments` would be `STRIPE_CONNECT`
- `paymentReference` would be the Stripe Transfer ID

### Option B — Bank transfer audit trail (simpler)

- Keep manual bank transfers as the payout method
- Use the `paymentMethod` and `paymentReference` columns (from Phase 1) to record `BANK_TRANSFER` and the bank reference number
- No Stripe Connect complexity

---

## What Requires No Changes

These components are already card-payment-ready:

| Component | Why |
|-----------|-----|
| `SettlementCalculationEngine` | Branches on `paymentCollection` — markup remittance correctly skips for `PREPAID_TO_PLATFORM` |
| Settlement rules (commission config) | Payment-method-agnostic — same commission math regardless of cash or card |
| `SettlingService` carry-forward logic | Works identically for any payment method |
| Settlement request flow | Admin-initiated settlement requests are independent of customer payment method |
| `FinancialService.cancelOrderSettlements()` | Voids pending settlements on cancellation — works the same |

---

## Risk Considerations

- **PCI compliance**: Using Stripe Elements / Payment Sheet keeps card data off your servers. Never handle raw card numbers in the API.
- **Double-charge prevention**: Use Stripe's idempotency keys when creating PaymentIntents. The order creation advisory lock (`pg_advisory_xact_lock`) already prevents duplicate settlement creation.
- **Webhook reliability**: Stripe retries failed webhooks. The order `paymentStatus` column acts as the source of truth — the webhook handler should be idempotent (check current status before updating).
- **Currency**: The system currently uses EUR exclusively. Stripe supports EUR natively. No multi-currency concerns unless expanding to other regions.
- **Kosovo/regional considerations**: Verify Stripe availability in Kosovo. Alternatives: PayPal, local bank integrations, or Square.
