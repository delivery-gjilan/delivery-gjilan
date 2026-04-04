# Minimum Order Amount

<!-- MDS:FF5 | Domain: Business Logic | Updated: 2026-04-03 | Status: SHIPPED -->
<!-- Depends-On: B2, B3, BL2, UI1 -->
<!-- Nav: Business schema → B7. Order validation → B2, B3. Admin business edit UI → update UI1. -->

## Goal

Allow admins to configure a **minimum order subtotal** per business. The customer cannot place an order if their cart subtotal is below that threshold. The cart screen shows a clear progress bar and blocked checkout state until the minimum is met.

---

## Scope

| Layer | What changes |
|-------|-------------|
| DB | New `min_order_amount` column on `businesses` |
| GraphQL | `Business` type + `UpdateBusinessInput` + `CreateBusinessInput` |
| API enforcement | `OrderService.createOrder` — hard reject if subtotal < minimum |
| Admin panel | Business edit form (both list page quick-edit and `[id]` detail page) |
| mobile-customer | Cart screen — minimum bar, disabled checkout button, label |

---

## Step 1 — Database

### 1a. Schema (`api/database/schema/businesses.ts`)

Add after `commissionPercentage`:

```ts
minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }).default('0').notNull(),
```

Default `0` means "no minimum" — keeps all existing businesses unaffected.

### 1b. Migration

```bash
cd api
npm run db:generate -- --name add-min-order-amount-to-businesses
npm run db:migrate
```

---

## Step 2 — GraphQL Schema

### `api/src/models/Business/Business.graphql`

Add `minOrderAmount: Float!` to the `Business` type:

```graphql
type Business {
    ...existing fields...
    minOrderAmount: Float!
}
```

Add to both `CreateBusinessInput` and `UpdateBusinessInput`:

```graphql
input UpdateBusinessInput {
    ...existing fields...
    minOrderAmount: Float
}

input CreateBusinessInput {
    ...existing fields...
    minOrderAmount: Float
}
```

After schema change, run codegen:

```bash
cd api && npm run codegen
cd admin-panel && npm run codegen
cd mobile-customer && npm run codegen
```

---

## Step 3 — API Resolver / Service

### `api/src/validators/BusinessValidator.ts`

Add `minOrderAmount` to the update/create Zod schemas:

```ts
minOrderAmount: z.number().min(0).optional(),
```

### `api/src/services/BusinessService.ts`

Pass `minOrderAmount` through to the DB insert/update in `createBusiness` / `updateBusiness`. No special logic needed — it's a plain numeric field.

### `api/src/services/OrderService.ts` — enforcement in `createOrder`

After the items total is calculated (after the promotion engine resolves `effectiveOrderPrice`), add a guard:

```ts
// Fetch the business's minimum order amount
const [orderBiz] = await db
    .select({ minOrderAmount: businessesTable.minOrderAmount })
    .from(businessesTable)
    .where(eq(businessesTable.id, orderBusinessId));

const minOrderAmount = Number(orderBiz?.minOrderAmount ?? 0);
if (minOrderAmount > 0 && effectiveOrderPrice < minOrderAmount) {
    throw AppError.badInput(
        `Minimum order amount for this business is €${minOrderAmount.toFixed(2)}. Your subtotal is €${effectiveOrderPrice.toFixed(2)}.`
    );
}
```

**Where**: insert this block right after `const effectiveOrderPrice = promoResult.finalSubtotal;` (around line 563), before the price-mismatch check.

**Note**: enforcement is on `effectiveOrderPrice` (items after promotions), not the raw subtotal — a promotion that reduces the subtotal below the minimum should still be blocked. This mirrors real-world behaviour.

---

## Step 4 — Admin Panel

### 4a. GraphQL operation (`admin-panel/src/graphql/operations/businesses/`)

Add `minOrderAmount` to the `GET_BUSINESS`, `GET_BUSINESSES`, and `UPDATE_BUSINESS` fragments/mutations so the field is available in the admin UI.

### 4b. Business list page (`admin-panel/src/app/dashboard/businesses/page.tsx`)

In the quick-edit modal form, add a **Minimum Order (€)** number input:

```tsx
<Input
    label="Minimum Order Amount (€)"
    type="number"
    min={0}
    step={0.5}
    value={editForm.minOrderAmount ?? 0}
    onChange={(e) => setEditForm({ ...editForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
    helper="Set to 0 to disable minimum order enforcement"
/>
```

Include `minOrderAmount` in the `updateBusiness` mutation variables.

### 4c. Business detail page (`admin-panel/src/app/dashboard/businesses/[id]/page.tsx`)

Same treatment — add the field to the edit form and mutation call.

---

## Step 5 — mobile-customer Cart Screen

### 5a. GraphQL query — `GET_BUSINESS`

The cart already has `businessIds` in scope. Add a query (or extend the existing business query used by `BusinessScreen`) to fetch `minOrderAmount` for the cart's business.

Suggested new lightweight query in `mobile-customer/graphql/operations/businesses.ts`:

```ts
export const GET_BUSINESS_MINIMUM = gql`
    query GetBusinessMinimum($id: ID!) {
        business(id: $id) {
            id
            minOrderAmount
        }
    }
`;
```

Execute with `useQuery(GET_BUSINESS_MINIMUM, { variables: { id: businessIds[0] }, skip: !businessIds[0] })` inside `CartScreen`.

### 5b. Derived state in `CartScreen`

```ts
const minOrderAmount = Number(businessMinData?.business?.minOrderAmount ?? 0);
const minimumMet = minOrderAmount <= 0 || total >= minOrderAmount;
const amountUntilMinimum = Math.max(0, minOrderAmount - total);
```

### 5c. Progress bar component (reuse spend-threshold pattern)

The cart already has a spend-threshold progression bar. Add a **minimum order bar** shown above it (or instead of it when no spend-threshold applies):

- Shown only when `minOrderAmount > 0` and `!minimumMet`
- Progress: `total / minOrderAmount` (clamped 0–1)
- Text: `"Minimum order: €{minOrderAmount} — Add €{amountUntilMinimum} more to continue"`
- Bar colour: use `theme.colors.expense` (red-ish) while not met; switches to `theme.colors.success` when met

### 5d. Place Order button

Add `minimumMet` to the existing disabled condition on the checkout button:

```tsx
// Before (line 1580):
disabled={isProcessing || deliveryPriceLoading || isSelectedLocationInZone === false}

// After:
disabled={isProcessing || deliveryPriceLoading || isSelectedLocationInZone === false || !minimumMet}
```

When `!minimumMet`, render a label below the button:

```tsx
{!minimumMet && (
    <Text style={{ color: theme.colors.expense, textAlign: 'center', marginTop: 4, fontSize: 12 }}>
        {t.cart.minimum_not_met.replace('{amount}', `€${amountUntilMinimum.toFixed(2)}`)}
    </Text>
)}
```

### 5e. Add translation key

In both `en` and `al` localisation files, add:

```ts
cart: {
    ...existing,
    minimum_not_met: "Add €{amount} more to reach the minimum order",
}
```

---

## Files to Create / Modify

| Path | Action | Notes |
|------|--------|-------|
| `api/database/schema/businesses.ts` | **Modify** | Add `minOrderAmount` column |
| `api/database/migrations/XXXX_add-min-order-amount-to-businesses.sql` | **Generate** | Via `npm run db:generate` |
| `api/src/models/Business/Business.graphql` | **Modify** | Add field + input fields |
| `api/src/validators/BusinessValidator.ts` | **Modify** | Zod schema |
| `api/src/services/BusinessService.ts` | **Modify** | Pass field through |
| `api/src/services/OrderService.ts` | **Modify** | Enforcement guard in `createOrder` |
| `admin-panel/src/graphql/operations/businesses/` | **Modify** | Include `minOrderAmount` in fragments |
| `admin-panel/src/app/dashboard/businesses/page.tsx` | **Modify** | Add input to quick-edit modal |
| `admin-panel/src/app/dashboard/businesses/[id]/page.tsx` | **Modify** | Add input to detail edit form |
| `mobile-customer/graphql/operations/businesses.ts` | **Modify** | Add `GET_BUSINESS_MINIMUM` query |
| `mobile-customer/modules/cart/components/CartScreen.tsx` | **Modify** | Minimum bar + disabled state |
| `mobile-customer/localization/**` | **Modify** | Add `cart.minimum_not_met` key |

---

## Validation Checklist (before shipping)

- [ ] `minOrderAmount = 0` businesses are unaffected — checkout works as before
- [ ] API rejects orders where `effectiveOrderPrice < minOrderAmount` with a clear error message
- [ ] Promo-discounted subtotal below minimum is also rejected (enforcement on `effectiveOrderPrice`)
- [ ] Admin can set minimum to 0 to disable it
- [ ] Cart screen shows the minimum bar only when minimum > 0 and not yet met
- [ ] Place Order button is disabled and shows label when minimum not met
- [ ] Bar turns green / button re-enables as soon as minimum is reached
- [ ] Both Albanian and English translations present
- [ ] Codegen re-run and TypeScript clean across api, admin-panel, mobile-customer
