# Admin + Mobile-Business UI Context

This document is a fast context handoff for future UI changes across `admin-panel` and `mobile-business`.

## Scope

- Admin product management UX
- Product creation/edit/delete for regular products, offers (deals), and variants
- GraphQL contracts and hooks that drive these flows
- Safe change checklist to keep codegen and UI stable

## Key Files

### Admin Panel

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

## Quick Extension Ideas

- Add table badges for `Offer` and `Variant`
- Add guardrails to block deleting the last variant in a group without confirmation
- Add analytics events for create/edit/delete by product type
