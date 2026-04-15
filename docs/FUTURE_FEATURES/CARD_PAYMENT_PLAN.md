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

## Phase 5 — Business & Driver Bank Details + Settlement Payout

**Goal:** Collect and store bank account information for every business (and optionally drivers) so the platform can settle via bank transfer or automated payouts.

### Why this is needed

When customer payments are collected online (PREPAID_TO_PLATFORM), the platform holds the funds. To pay businesses their share, the platform needs their banking details. Even for CASH_TO_DRIVER orders, businesses may owe the platform (RECEIVABLE settlements) and the platform may need to invoice or receive transfers — having bank details on file streamlines this.

### 5A — Database: Bank Details Schema

Add a new table `bank_accounts` to keep banking info separate from the main entity tables (cleaner security boundary, supports multiple accounts per entity in the future).

**Table: `bank_accounts`** (`api/database/schema/bankAccounts.ts`)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `entityType` | enum (`BUSINESS`, `DRIVER`) | Who owns this account |
| `businessId` | uuid, nullable, FK → businesses | |
| `driverId` | uuid, nullable, FK → drivers | |
| `accountHolderName` | varchar(200) | Legal name on the bank account |
| `bankName` | varchar(200), nullable | Name of the bank (e.g. "ProCredit Bank Kosovo") |
| `iban` | varchar(34), nullable | International Bank Account Number (standard in Kosovo/EU) |
| `accountNumber` | varchar(30), nullable | Local account number (if IBAN not available) |
| `routingNumber` | varchar(20), nullable | Bank routing/sort code (US-style, or local equivalent) |
| `swiftBic` | varchar(11), nullable | SWIFT/BIC code for international transfers |
| `currency` | varchar(3), default `'EUR'` | Account currency |
| `isPrimary` | boolean, default `true` | Primary payout account for this entity |
| `isVerified` | boolean, default `false` | Admin has confirmed the details are correct |
| `verifiedAt` | timestamp, nullable | When verification occurred |
| `verifiedByUserId` | uuid, nullable, FK → users | Who verified |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Why a separate table instead of columns on `businesses`:**
- Allows multiple bank accounts per business (e.g. different accounts for different currencies, or business owner changes bank)
- Easier to audit access — can add row-level access logging
- Cleaner to extend for drivers without duplicating columns
- Sensitive financial data can have stricter access controls at the table level

**Alternative (simpler):** Add `iban`, `accountHolderName`, `bankName`, `swiftBic` columns directly to the `businesses` table if multi-account support is not needed.

### 5B — GraphQL Schema

```graphql
type BankAccount {
    id: ID!
    entityType: SettlementType! # reuse BUSINESS | DRIVER enum
    accountHolderName: String!
    bankName: String
    ibanLast4: String           # Only expose last 4 digits
    accountNumberLast4: String  # Only expose last 4 digits
    swiftBic: String
    currency: String!
    isPrimary: Boolean!
    isVerified: Boolean!
    verifiedAt: Date
    createdAt: Date!
}

input UpsertBankAccountInput {
    entityType: SettlementType!
    businessId: ID
    driverId: ID
    accountHolderName: String!
    bankName: String
    iban: String
    accountNumber: String
    routingNumber: String
    swiftBic: String
    currency: String
}

extend type Mutation {
    upsertBankAccount(input: UpsertBankAccountInput!): BankAccount!
    verifyBankAccount(bankAccountId: ID!): BankAccount!
    deleteBankAccount(bankAccountId: ID!): Boolean!
}

extend type Business {
    bankAccounts: [BankAccount!]!
    primaryBankAccount: BankAccount
}

extend type Driver {
    bankAccounts: [BankAccount!]!
    primaryBankAccount: BankAccount
}
```

**Security:** Full IBAN/account numbers are write-only from the client perspective. The API accepts full values on create/update but only returns masked versions (last 4 digits). Full values are only visible in the admin panel's settlement payout view (admin-only resolver with role check).

### 5C — Admin Panel UI

**Business detail page → new "Bank Details" tab/section:**
- Form fields: Account Holder Name, Bank Name, IBAN, SWIFT/BIC
- Show verification status badge (Verified ✓ / Unverified)
- "Verify" button for admins to confirm details are correct
- Display masked IBAN (e.g. `**** **** **** 4521`)
- Show full IBAN only behind a "Reveal" toggle with audit log

**Settlement payout flow enhancement:**
- When settling with a business, show their primary bank account details in the settlement modal
- Pre-fill `paymentMethod: BANK_TRANSFER` and allow admin to paste the bank transfer reference number
- After settlement, the `paymentReference` column stores the actual bank transfer ID

**Driver detail page:**
- Same bank details section (optional — drivers are often paid cash)

### 5D — Business Onboarding / Self-Service

**mobile-business app:**
- Add "Bank Details" screen in business profile/settings
- Business owner enters their IBAN, account holder name, bank name
- Data submitted via `upsertBankAccount` mutation
- Show "Pending Verification" status until admin verifies

**Admin panel:**
- New businesses without bank details show a warning badge
- Settlement payout button disabled until bank account is verified

### 5E — Payout Execution Options

#### Option A — Manual Bank Transfer (Phase 1, simplest)

1. Admin opens settlement modal for a business
2. Sees the business's verified bank account details (IBAN, name, bank)
3. Admin initiates a manual bank transfer from the platform's bank account
4. Admin pastes the transfer reference into the settlement form
5. System records `paymentMethod: BANK_TRANSFER`, `paymentReference: <ref>` on `settlement_payments`

This requires no payment processor integration. The bank details serve as a reference for the admin.

#### Option B — Stripe Connect (Phase 2, automated)

- Businesses onboard as Stripe Connected Accounts (Custom or Express)
- Stripe collects and verifies bank details during onboarding (handles KYC)
- Store `stripeConnectedAccountId` on the `businesses` table
- When `settleWithBusiness` is called, initiate a Stripe Transfer to the connected account
- `paymentMethod` = `STRIPE_CONNECT`, `paymentReference` = Stripe Transfer ID
- Stripe handles payout to business's bank account on their schedule

**Stripe Connect considerations for Kosovo:**
- Stripe is available in Kosovo as of recent expansions — verify current status before implementation
- Alternative: use Stripe's cross-border payouts if direct Kosovo support is limited
- Fallback: integrate with a local payment provider (e.g., Raiffeisen Bank Kosovo API)

#### Option C — Hybrid

- Use Stripe Connect for customer payment collection (Phase 2)
- Use manual bank transfers for business payouts (Option A) initially
- Migrate to automated payouts (Option B) once volume justifies the Stripe Connect setup

### 5F — Security & Compliance

| Concern | Mitigation |
|---------|-----------|
| **Sensitive data storage** | Encrypt IBAN/account numbers at rest (application-level encryption or DB column encryption). Never log full bank details. |
| **Access control** | Only ADMIN role can read full bank details. Business owners can only see/edit their own. Drivers can only see/edit their own. |
| **Audit trail** | Log all reads of full bank details (who, when, why). Log all changes to bank account records. |
| **Verification** | Require admin verification before bank details are used for payouts. Consider micro-deposit verification (send €0.01 and ask business to confirm amount). |
| **Data retention** | When a business is soft-deleted, bank details remain for audit but are flagged inactive. Do not hard-delete bank records. |
| **PCI/PSD2** | Bank account details (IBAN, account numbers) are not PCI-scoped, but should still be treated as sensitive PII under GDPR. |

### 5G — Migration Checklist

1. [ ] Create `bank_accounts` table migration
2. [ ] Add GraphQL types, inputs, mutations, and resolvers
3. [ ] Add `BankAccountRepository` (no soft-delete needed — use hard delete or active flag)
4. [ ] Add bank details form to admin-panel business detail page
5. [ ] Add bank details screen to mobile-business app
6. [ ] Update settlement payout modal to show bank details
7. [ ] Persist `paymentMethod` and `paymentReference` in `SettlingService` (Phase 1 columns)
8. [ ] Add admin verification flow
9. [ ] Add encryption for stored bank details
10. [ ] Add audit logging for bank detail access

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
