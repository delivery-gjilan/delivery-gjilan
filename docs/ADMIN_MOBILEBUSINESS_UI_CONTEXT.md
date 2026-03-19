# Admin + Mobile-Business UI Context

<!-- MDS:UI1 | Domain: UI | Updated: 2026-03-19 -->
<!-- Depends-On: BL2 -->
<!-- Depended-By: M5 -->
<!-- Nav: Product type/variant changes → update BL2 (Product Refactor), M5 (Input Flow). Admin panel mutations → review B1 (API). -->

This document is a fast context handoff for future UI changes across `admin-panel` and `mobile-business`.

## Recent Updates

- 2026-03-19: In `admin-panel/src/components/businesses/ProductsBlock.tsx`, `Questions / Options` action is now shown only for deal/offer products; delete actions for questions/answers now use an explicit confirmation modal.
- 2026-03-19: Deal creation/editing in product forms is now admin-only in UI (`SUPER_ADMIN`/`ADMIN`); business roles no longer see deal toggles.
- 2026-03-19: Business-role dashboard landing now redirects to statistics via `admin-panel/src/app/dashboard/page.tsx`.
- 2026-03-19: Topbar controls for store live/close and global banner are now super-admin-only in UI and API (`admin-panel/src/components/dashboard/topbar.tsx`, `api/src/models/General/resolvers/Mutation/updateStoreStatus.ts`).
- 2026-03-18: Fixed admin settlements table rendering condition in `admin-panel/src/app/admin/financial/settlements/page.tsx` where selected-business view could show footer counts ("Showing x of x") but render no rows due nested ternary boolean output.
- 2026-03-18: Reorganized `admin-panel` sidebar navigation sections/order in `admin-panel/src/components/dashboard/sidebar.tsx` with requested grouping: Operations first, Pricing & Promotions second, Finance & Admin third, and remaining links under Other.

## Scope

- Admin product management UX
- Product creation/edit/delete for regular products, offers (deals), and variants
- GraphQL contracts and hooks that drive these flows
- Safe change checklist to keep codegen and UI stable

## Key Files

### Admin Panel

- `admin-panel/src/app/dashboard/productpricing/page.tsx`
  - Business-scoped product markup/night pricing editor
  - Shows base price, markup price, night price, and delta display
  - Row highlighting for missing markup/night values
  - Note: UTF-8 text rendering matters for currency/time labels (avoid mojibake such as `â‚¬`, `â€¦`)

- `admin-panel/src/app/dashboard/market/page.tsx`
  - Rich market management page (categories, subcategories, products, sorting)
  - Product create/edit modal supports:
    - `isOffer` (deal/offer)
    - `variantGroupId` (variant membership)
  - Delete modal supports:
    - delete single product
    - delete full variant group (optional checkbox when product belongs to a variant group)

- `admin-panel/src/components/businesses/ProductsBlock.tsx`
  - Reusable products management block used outside market page
  - Mirrors create/edit/delete behavior for product/offer/variant
  - Includes variant-group select/create in create and edit flows

- `admin-panel/src/lib/hooks/useProducts.ts`
  - Core product hooks and data flattening from `ProductCard -> Product`
  - Includes hooks for:
    - `useCreateProductVariantGroup`
    - `useDeleteProductVariantGroup`

- `admin-panel/src/graphql/operations/products/queries.ts`
  - Product query includes nested product and variant metadata:
    - `isOffer`
    - `variantGroupId`
    - `variantGroup { id name }`

- `admin-panel/src/graphql/operations/products/mutations.ts`
  - Product and variant-group mutations:
    - `CREATE_PRODUCT`
    - `UPDATE_PRODUCT`
    - `DELETE_PRODUCT`
    - `CREATE_PRODUCT_VARIANT_GROUP`
    - `DELETE_PRODUCT_VARIANT_GROUP`

### Mobile Business

- `mobile-business/graphql/products.ts`
  - Uses `products(...)` as `ProductCard` shape; reads rich fields from nested `product`

- `mobile-business/app/(tabs)/products.tsx`
  - Flattens card payload to the local `Product` shape

- `mobile-business/app/(tabs)/dashboard.tsx`
  - Reads product availability from flattened/nested product data

## Current Product Type Behavior

- Regular Product:
  - `isOffer = false`
  - `variantGroupId = null`

- Offer / Deal Product:
  - `isOffer = true`
  - `variantGroupId = null`

- Variant Product:
  - `isOffer = false`
  - `variantGroupId = <group id>`

- UI mutual exclusivity:
  - Selecting offer clears variant group
  - Selecting variant clears offer flag

## Delete Rules

- Category delete: cascades to subcategories/products (warning shown)
- Subcategory delete: cascades to products (warning shown)
- Product delete:
  - default deletes only selected product
  - if product has `variantGroupId`, user can choose to delete entire variant group
  - offer products display explicit deal/offer warning

## GraphQL Contract Notes

- `OrderItem` uses `unitPrice` (not `price`)
- `products(businessId)` returns `ProductCard`
  - do not assume flat product fields at top level
  - read product details from `ProductCard.product`

## Dev Workflow (Safe)

1. Update GraphQL documents first (`admin-panel/src/graphql/operations/...`)
2. Run codegen:
   - `cd admin-panel && npm run codegen`
3. Fix TS errors in hooks/UI consumers
4. Re-run codegen if documents changed again
5. Validate delete flows manually:
   - delete regular product
   - delete offer
   - delete variant only
   - delete whole variant group

## Common Pitfalls

- Forgetting to map nested `ProductCard.product` fields in hooks
- Setting both `isOffer` and `variantGroupId` simultaneously
- Querying stale fields after schema updates
- Updating UI types but not mutation payloads (or vice versa)
- Saving files with the wrong encoding, which can corrupt UI symbols (currency sign, ellipsis, dash)

## Quick Extension Ideas

- Add table badges for `Offer` and `Variant`
- Add guardrails to block deleting the last variant in a group without confirmation
- Add analytics events for create/edit/delete by product type
