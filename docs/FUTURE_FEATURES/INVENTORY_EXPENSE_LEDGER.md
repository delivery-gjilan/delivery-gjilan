# FF8 - Inventory Expense Ledger and Reference Codes

<!-- MDS:FF8 | Domain: Future Feature | Status: Planned -->
<!-- Depends-On: FF1, B7, BL1, M13, W1 -->
<!-- Goal: Track stock purchase expenses as immutable ledger events with filtering and searchable reference codes. -->

## Objective

Track how much money is spent to buy stock for personal inventory in a way that is:

- immutable (expense history never lost)
- filterable (date, product, supplier, payment method, reference)
- auditable (who created/edited/voided)
- reconcilable against inventory quantity changes and stock-remittance earnings

This complements existing inventory quantity and margin views.

## Current Behavior Snapshot

Current system has:

1. Quantity + current cost snapshot in personal inventory.
2. Stock coverage and revenue tracking from delivered orders.
3. Inventory earnings query that computes cost from current costPrice.

Gap:

- No transaction ledger for inventory purchases/expenses.
- Updating costPrice can change historical profit/cost reporting retroactively.
- No purchase reference code to quickly find one stock buy entry.

## Design Decision

Keep personal_inventory as current-state snapshot, and add a separate immutable expense ledger.

- personal_inventory = "what you currently hold"
- inventory_expense_entries = "what you spent and when"

Do not overload setInventoryQuantity to represent accounting history.

## Data Model

### 1) inventory_expense_entries (new)

Columns:

- id (uuid)
- business_id (uuid)
- reference_code (varchar, unique)
- expense_type (enum)
  - STOCK_PURCHASE
  - STOCK_ADJUSTMENT_LOSS
  - STOCK_ADJUSTMENT_GAIN
  - SHIPPING
  - OTHER
- supplier_name (varchar nullable)
- supplier_invoice_number (varchar nullable)
- payment_method (enum)
  - CASH
  - BANK_TRANSFER
  - CARD
  - CREDIT
  - OTHER
- currency (varchar default EUR)
- subtotal_amount (numeric)
- tax_amount (numeric default 0)
- total_amount (numeric)
- notes (varchar nullable)
- purchased_at (timestamp with timezone)
- created_by_user_id (uuid nullable)
- voided_at (timestamp nullable)
- void_reason (varchar nullable)
- created_at / updated_at

Indexes:

- unique(reference_code)
- index(business_id, purchased_at)
- index(expense_type, purchased_at)
- index(payment_method, purchased_at)
- index(voided_at)

### 2) inventory_expense_line_items (new)

Columns:

- id (uuid)
- expense_entry_id (uuid fk)
- product_id (uuid nullable for non-product expenses)
- quantity (numeric)
- unit_cost (numeric)
- line_subtotal (numeric)
- line_notes (varchar nullable)

Indexes:

- index(expense_entry_id)
- index(product_id)

### 3) inventory_stock_movements (optional but recommended)

Unify quantity movement audit trail:

- PURCHASE_IN
- MANUAL_SET
- ORDER_DEDUCT
- CANCEL_RESTORE
- SPOILAGE
- CORRECTION

This table links movement rows to expense_entry_id when movement comes from purchase.

## Reference Code Strategy

Human-friendly and sortable code format:

- INV-BUY-YYYYMMDD-XXXX

Example:

- INV-BUY-20260417-0042

Rules:

1. Generated server-side only.
2. Monotonic per day sequence.
3. Never reused.
4. Survives soft delete/void state.

Alternative:

- Include business short code prefix if multiple inventory businesses will exist.

## API Contract

### New Mutations

1. createInventoryExpenseEntry(input)
- Creates header + lines
- Creates linked stock movement rows
- Increments personal_inventory quantities for purchased products
- Returns entry with reference_code

2. voidInventoryExpenseEntry(id, reason)
- Accounting reversal policy:
  - marks entry voided
  - creates compensating stock movement if required
- never hard deletes

3. updateInventoryExpenseEntryMeta(id, notes, supplier_name, invoice_number)
- metadata-only updates
- line amounts immutable after posting

### New Queries

1. inventoryExpenseEntries(filter, pagination, sort)
- filters:
  - date range
  - reference_code contains
  - supplier
  - payment_method
  - expense_type
  - product_id
  - min/max amount
  - includeVoided

2. inventoryExpenseEntry(id)
- detail view with line items and stock movement links

3. inventoryExpenseSummary(filter)
- totalSpent
- totalVoided
- totalNetSpend
- spendByPaymentMethod
- spendBySupplier
- spendByProduct

## Admin Panel UX Plan

### A) New Inventory Expenses tab

Route suggestion:

- dashboard/inventory/expenses

Table columns:

- Date
- Reference code
- Supplier
- Payment method
- Type
- Total
- Voided status
- Actions

### B) Filter bar

- Date range
- Search by reference code
- Product filter
- Supplier filter
- Payment method
- Include voided toggle

### C) Create expense modal

Fields:

- supplier
- invoice number
- payment method
- purchase date
- one or many line items (product, qty, unit cost)
- optional shipping/other lines

Submit behavior:

- create ledger row
- update personal inventory quantities
- show generated reference code in success toast

### D) Reference code quick-copy

Add copy button in rows and detail drawer for faster support/accounting lookup.

## Reporting and Earnings Consistency

Current inventoryEarnings cost logic depends on current costPrice.

Upgrade recommendation:

1. Use weighted average cost per product driven by stock movement ledger.
2. Or compute COGS per deducted order item based on locked cost layer at deduction time.

Minimum viable consistency improvement:

- when deducting stock, persist fromStockUnitCost in coverage log and use that for profit reporting.

This avoids retroactive distortion when costPrice is edited later.

## Permissions and Audit

- SUPER_ADMIN can create, void, view all.
- ADMIN view-only unless explicitly allowed.
- Every create/void writes audit log with actor id and reference_code.

## Rollout Plan

1. Add schema and migrations.
2. Add backend create/query/void APIs.
3. Add admin panel expenses tab and filters.
4. Wire inventory earnings to ledger-based cost logic.
5. Add exports (CSV) by filter.

## Acceptance Criteria

1. Every stock purchase has unique searchable reference code.
2. Operator can filter expenses by date, product, supplier, method, and code.
3. Expense history is immutable and auditable (void, no hard delete).
4. Stock quantity changes from purchases are traceable to specific expense entries.
5. Profit/expense reporting does not change retroactively when current costPrice is edited.
