# Product, Business, Category Flow (Refactor Guide)

Date: 2026-03-13

This document maps how products/businesses/categories/subcategories are created and deleted in backend, and how restaurant product data is fetched/rendered in frontend (`mobile-customer`).

Use this as a dependency map before refactoring.

---

## 1) Scope and Entry Points

### Backend mutation entry points
- Product create/delete:
  - `api/src/models/Product/resolvers/Mutation/createProduct.ts`
  - `api/src/models/Product/resolvers/Mutation/deleteProduct.ts`
- Business create/delete:
  - `api/src/models/Business/resolvers/Mutation/createBusiness.ts`
  - `api/src/models/Business/resolvers/Mutation/deleteBusiness.ts`
- Category create/delete:
  - `api/src/models/ProductCategory/resolvers/Mutation/createProductCategory.ts`
  - `api/src/models/ProductCategory/resolvers/Mutation/deleteProductCategory.ts`
- Subcategory create/delete:
  - `api/src/models/ProductSubcategory/resolvers/Mutation/createProductSubcategory.ts`
  - `api/src/models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory.ts`

### Frontend restaurant/product entry points
- Restaurant list screen:
  - `mobile-customer/app/(tabs)/restaurants.tsx`
- Business details route:
  - `mobile-customer/app/business/[businessId].tsx`
- Business screen (real restaurant menu rendering):
  - `mobile-customer/modules/business/BusinessScreen.tsx`

---

## 2) Backend Create/Delete Flows

## 2.1 Product Create Flow

### Call chain
1. GraphQL mutation `createProduct(input)`
2. Resolver validates permission for `BUSINESS_EMPLOYEE`:
   - checks granular permission `manage_products`
   - enforces `input.businessId === context.businessId`
3. Calls `productService.createProduct(input)`
4. Service validates input (Zod)
5. Repository inserts into `products`
6. If `stock` provided and `> 0`, inserts into `product_stocks`
7. Resolver writes audit log `PRODUCT_CREATED`

### Files
- Resolver: `api/src/models/Product/resolvers/Mutation/createProduct.ts`
- Service: `api/src/services/ProductService.ts`
- Validator: `api/src/validators/ProductValidator.ts`
- Repository: `api/src/repositories/ProductRepository.ts`
- Stock table: `api/database/schema/productStock.ts`

### Notes
- No explicit cache invalidation is done in product create resolver.
- Read path currently relies heavily on client cache policy and direct DB reads.

---

## 2.2 Product Delete Flow

### Call chain
1. GraphQL mutation `deleteProduct(id)`
2. Resolver loads product (`getProduct`) first for authorization metadata
3. For `BUSINESS_EMPLOYEE`, enforces `manage_products` + same business restriction
4. Calls `productService.deleteProduct(id)`
5. Repository hard deletes from `products`
6. `product_stocks` row is deleted via FK cascade (`product_id -> products.id onDelete: cascade`)
7. Resolver writes audit log `PRODUCT_DELETED` when deletion succeeds

### Files
- Resolver: `api/src/models/Product/resolvers/Mutation/deleteProduct.ts`
- Service: `api/src/services/ProductService.ts`
- Repository: `api/src/repositories/ProductRepository.ts`
- FK behavior: `api/database/schema/productStock.ts`

---

## 2.3 Business Create Flow

### Call chain
1. GraphQL mutation `createBusiness(input)`
2. Resolver calls service directly
3. Service validates input and converts `workingHours` from `HH:MM` to minute offsets
4. Repository inserts into `businesses`
5. Resolver invalidates businesses cache (`invalidateAllBusinesses`)
6. Resolver writes audit log `BUSINESS_CREATED`

### Files
- Resolver: `api/src/models/Business/resolvers/Mutation/createBusiness.ts`
- Service: `api/src/services/BusinessService.ts`
- Validator: `api/src/validators/BusinessValidator.ts`
- Repository: `api/src/repositories/BusinessRepository.ts`
- Cache: `api/src/lib/cache.ts`

---

## 2.4 Business Delete Flow

### Call chain
1. GraphQL mutation `deleteBusiness(id)`
2. Resolver calls service delete
3. Service delegates to repository
4. Repository performs **soft delete** (`deleted_at = CURRENT_TIMESTAMP`)
5. Resolver invalidates business cache (`invalidateBusiness(id)`)

### Files
- Resolver: `api/src/models/Business/resolvers/Mutation/deleteBusiness.ts`
- Service: `api/src/services/BusinessService.ts`
- Repository: `api/src/repositories/BusinessRepository.ts`

### Important behavior
- This is soft delete, not hard delete.
- `findAll`/`findById` for business filters `deletedAt IS NULL`, so business disappears from business queries.
- Product/category rows are not deleted by this operation (because business row remains, only marked deleted).

---

## 2.5 Product Category Create/Delete Flow

### Create
1. `createProductCategory(input)`
2. Service validates input
3. Repository inserts into `product_categories`
4. Resolver invalidates category cache for that business

### Delete
1. `deleteProductCategory(id)`
2. Resolver fetches category first (to get `businessId` for cache invalidation)
3. Service calls repository delete
4. Repository hard deletes category row
5. Resolver invalidates category cache

### Files
- Resolver create: `api/src/models/ProductCategory/resolvers/Mutation/createProductCategory.ts`
- Resolver delete: `api/src/models/ProductCategory/resolvers/Mutation/deleteProductCategory.ts`
- Service: `api/src/services/ProductCategoryService.ts`
- Repository: `api/src/repositories/ProductCategoryRepository.ts`

### FK side effects
- `product_categories.business_id -> businesses.id onDelete: cascade`
- `products.category_id -> product_categories.id onDelete: cascade`
- Deleting a category hard deletes all products in that category.

---

## 2.6 Product Subcategory Create/Delete Flow

### Create
1. `createProductSubcategory(input)`
2. Service validates + inserts row
3. Resolver fetches parent category to get businessId
4. Resolver invalidates subcategory cache by business/category

### Delete
1. `deleteProductSubcategory(id)`
2. Service/repo hard delete subcategory row
3. Resolver invalidates with broad pattern `cache:subcategories*`

### Files
- Resolver create: `api/src/models/ProductSubcategory/resolvers/Mutation/createProductSubcategory.ts`
- Resolver delete: `api/src/models/ProductSubcategory/resolvers/Mutation/deleteProductSubcategory.ts`
- Service: `api/src/services/ProductSubcategoryService.ts`
- Repository: `api/src/repositories/ProductSubcategoryRepository.ts`

### FK side effects
- `products.subcategory_id -> product_subcategories.id onDelete: set null`
- Deleting subcategory does not delete products; affected products become uncategorized by subcategory.

---

## 3) Read Paths Used by Frontend

## 3.1 Backend query resolvers for UI reads
- `businesses` -> `businessService.getBusinesses()`
- `business(id)` -> `businessService.getBusiness(id)`
- `products(businessId)` -> `productService.getProducts(businessId)`
- `productCategories(businessId)` -> `productCategoryService.getProductCategories(businessId)`
- `productSubcategoriesByBusiness(businessId)` -> `productSubcategoryService.getProductSubcategoriesByBusiness(businessId)`

Files:
- `api/src/models/Business/resolvers/Query/businesses.ts`
- `api/src/models/Business/resolvers/Query/business.ts`
- `api/src/models/Product/resolvers/Query/products.ts`
- `api/src/models/ProductCategory/resolvers/Query/productCategories.ts`
- `api/src/models/ProductSubcategory/resolvers/Query/productSubcategoriesByBusiness.ts`

---

## 3.2 Frontend Restaurant List Flow (`restaurants.tsx`)

File: `mobile-customer/app/(tabs)/restaurants.tsx`

### Data flow
1. Loads all businesses with `useBusinesses()`
2. Filters to `businessType === 'RESTAURANT'`
3. Optional filters:
   - open now (`isOpen`)
   - has promotion (`activePromotion`)
4. Fetches product lists for:
   - first visible restaurant (`promoBusinessId`)
   - third visible restaurant (`featuredBusinessId`)
5. Builds a mixed list:
   - regular restaurant cards
   - promo banner inserted after first restaurant
   - featured restaurant card inserted after second restaurant

### Coupling points
- Presentation depends on list positions (index 0 and 2 business IDs).
- Promo/featured cards are coupled to product query shape (`name`, `price`, `salePrice`, `imageUrl`, `isAvailable`).
- Uses `GET_PRODUCTS` directly from operations file (not hook abstraction).

---

## 3.3 Frontend Business Menu Flow (`BusinessScreen.tsx`)

Files:
- `mobile-customer/app/business/[businessId].tsx` (route wrapper)
- `mobile-customer/modules/business/BusinessScreen.tsx` (actual screen)
- `mobile-customer/modules/business/components/ProductCard.tsx` (item rendering)

### Data fetching
1. `useBusiness(businessId)` -> business detail header info
2. `useProducts(businessId)` (business module hook) -> full product list
3. `GET_PRODUCT_CATEGORIES` query -> categories for tabs/sections
4. On screen focus: refetch categories and products

### Transformation and rendering
1. Categories are filtered and converted to `{id, name}`
2. Products grouped by `categoryId`
3. Category sections are rendered in order of `visibleCategories`
4. Products without category match go to `Other` section (`__uncategorized`)
5. Sticky category tabs and scroll-spy keep active section state
6. Search mode overlays results and reuses `ProductCard`

### Product card behavior
- Shows effective price (`salePrice` if on sale)
- Shows discount badge
- Shows unavailable overlay when `isAvailable` false
- Opens product details route `/product/[id]`
- Integrates cart controls

---

## 4) Data Model and Delete Semantics (Critical for Refactor)

### Business
- Delete is soft (`deletedAt` set)
- Business queries exclude deleted rows
- Related product/category rows remain unless explicitly deleted elsewhere

### Category
- Hard delete
- Cascades to products by FK

### Subcategory
- Hard delete
- Product FK set null

### Product
- Hard delete
- Stock rows cascade delete

---

## 5) Refactor Risks and Hidden Coupling

1. Inconsistent hook layers
- Two `useBusiness` definitions exist:
  - `mobile-customer/modules/business/hooks/useBusiness.ts`
  - `mobile-customer/modules/business/hooks/useBusinesses.ts` (exports another `useBusiness`)
- Two `useProducts` hooks exist with different fetch policies:
  - `mobile-customer/modules/business/hooks/useProducts.ts` (`cache-and-network`)
  - `mobile-customer/modules/product/hooks/useProducts.ts` (`cache-first`)

2. Category `isActive` mismatch
- UI checks `c.isActive !== false` in `BusinessScreen`
- `GET_PRODUCT_CATEGORIES` query only requests `id` and `name`
- Category service maps `isActive: true` but DB schema does not have an `is_active` column

3. Soft-delete business vs public product query
- Product query is public (`@skipAuth`) and keyed by `businessId`.
- If a deleted business ID is still known, product query behavior should be reviewed (business deletion does not hard-delete product rows).

4. Cache invalidation asymmetry
- Businesses/categories/subcategories have explicit invalidation paths.
- Product create/delete path currently does not invalidate a product list cache key in backend cache layer (if introduced later this can become stale).

5. Restaurants screen index-based promo logic
- Promo/featured composition relies on array positions; refactors in filtering/sorting can silently change card behavior.

---

## 6) What Must Change Together (Refactor Checklist)

If you refactor create/delete flows, update these together:

1. GraphQL schema files
- `api/src/models/Business/Business.graphql`
- `api/src/models/Product/Product.graphql`
- `api/src/models/ProductCategory/ProductCategory.graphql`
- `api/src/models/ProductSubcategory/productSubcategories.graphql`

2. Mutation resolvers + service + repository triads
- Business, Product, ProductCategory, ProductSubcategory

3. Validators and input contracts
- `api/src/validators/BusinessValidator.ts`
- `api/src/validators/ProductValidator.ts`
- `api/src/validators/ProductCategoryValidator.ts`
- `api/src/validators/ProductSubcategoryValidator.ts`

4. Client query documents and hooks
- `mobile-customer/graphql/operations/businesses/queries.ts`
- `mobile-customer/graphql/operations/products/queries.ts`
- business/product hooks and screen consumers

5. Frontend rendering surfaces
- `mobile-customer/app/(tabs)/restaurants.tsx`
- `mobile-customer/modules/business/BusinessScreen.tsx`
- `mobile-customer/modules/business/components/ProductCard.tsx`

---

## 7) Recommended Refactor Strategy

1. Introduce a canonical domain service contract first
- Define one source of truth for product/business/category/subcategory DTOs.

2. Consolidate duplicate hooks
- Keep a single `useBusiness` and a single `useProducts` implementation.
- Standardize fetch policy and refetch behavior.

3. Make delete semantics explicit
- Decide and document: soft delete or hard delete per entity.
- Enforce consistent behavior in service + repository + GraphQL docs.

4. Normalize category active state
- Either add real DB field + query field, or remove `isActive` usage from UI.

5. Decouple restaurants promo rendering from fixed indexes
- Use explicit featured/promo selection strategy (flag, score, campaign) rather than index positions.

6. Add integration tests around create/delete and restaurant menu display
- Product create with stock
- Category delete cascade behavior
- Subcategory delete set-null behavior
- Business soft delete visibility rules
- Restaurant list promo/featured composition

---

## 8) Quick Sequence Diagrams (Text)

### Create Product
GraphQL Mutation -> Resolver (permission checks) -> ProductService (validate) -> ProductRepository (insert product) -> optional stock insert -> AuditLog

### Delete Product
GraphQL Mutation -> Resolver (load product + permission checks) -> ProductService -> ProductRepository (hard delete) -> FK cascade stock delete -> AuditLog

### Delete Business
GraphQL Mutation -> BusinessService -> BusinessRepository (soft delete) -> cache.invalidateBusiness

### Restaurant Product Display
Route `/business/[businessId]` -> BusinessScreen -> useBusiness + useProducts + GET_PRODUCT_CATEGORIES -> group products by category -> render sectioned ProductCard list + search overlay
