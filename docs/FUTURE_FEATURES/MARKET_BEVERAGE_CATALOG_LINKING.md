# FF7 - Market Beverage Catalog Linking (Restaurants)

<!-- MDS:FF7 | Domain: Future Feature | Status: Planned -->
<!-- Depends-On: B2, B7, BL1, FF1, M8 -->
<!-- Goal: Allow only restaurant + market-beverage linking while keeping one active order and one order object. -->

## Objective

Enable one strict scenario:

- Every restaurant can list the same beverage catalog sourced from a designated market catalog.
- At checkout/order creation, these items remain part of the same restaurant order.
- Fulfillment prefers operator inventory first, then market for remainder.
- Driver sees explicit pickup instructions for: restaurant items, stock items, and market-sourced beverage items.

Non-goals:

- No generic multi-business cart.
- No parallel active orders per customer.
- No marketplace-style arbitrary source mixing.

## Current Building Blocks Already Present

1. Catalog adoption exists via `sourceProductId`:
   - `catalogProducts` query
   - `adoptCatalogProduct` mutation
   - `unadoptCatalogProduct` mutation
2. Inventory coverage already understands adopted products and resolves source product IDs at order creation.
3. Driver app already renders stock-vs-market quantity split via `inventoryQuantity`.
4. Active-order guard already blocks a second active order.

## Product Rule Set (ONLY this case)

### Allowed

- Target business type: `RESTAURANT`
- Source business type: `MARKET`
- Source products: beverages only (defined by explicit guard policy, not free text)
- Checkout shape: single `createOrder` payload, single order id

### Rejected

- MARKET -> MARKET adoption for this feature path
- RESTAURANT adopting non-beverage products via this path
- Any second active order while one is in-flight
- Any order containing items from two unrelated business menus (outside adopted-link exception)

## Display Model (Special Beverage Section)

Yes, linked beverages should be displayed in a dedicated section for clarity and control.

### Customer app display

- Keep one restaurant menu and one checkout flow.
- Render a distinct section such as "Beverages" or "Drinks from Market" inside the same restaurant page.
- Show a small visual marker on linked items (for example: "Linked"), but keep it subtle and customer-friendly.
- Allow restaurant-specific pricing to display as normal item price (no market price comparison shown to customer).

### Business/admin management display

- In product management, separate into two views:
  - Restaurant Menu Items
  - Linked Beverages
- Linked Beverages view should include:
  - source product name
  - source market business
  - local selling price override
  - sync status
  - quick un-link action
- Add filters: linked only, out-of-sync, unavailable at source, price-overridden.

### Why this section is important

- Prevents operators from mixing linked beverages into regular food categories by mistake.
- Makes margin management easier because beverage overrides are visible in one place.
- Reduces support mistakes by giving teams one obvious place to verify source linkage.

## Architecture Decision

Use and extend existing adopted-catalog model (do not introduce a new multi-order model).

- Keep `products.sourceProductId` as canonical link.
- Add strict policy/guard layer to constrain adoption and checkout behavior to beverage linking only.
- Add fulfillment snapshot fields so driver does not infer source by heuristics.

## Data Model Plan

### 1) Guard policy storage

Add explicit configuration for allowed linking policy:

Option A (preferred): new table `catalog_link_policies`
- `id`
- `target_business_type` (RESTAURANT)
- `source_business_id` (designated market)
- `allowed_category_ids` (or join table)
- `is_active`

Option B (faster but less explicit): store in `store_settings` as
- `beverageCatalogEnabled`
- `beverageSourceMarketBusinessId`
- `beverageCategoryIds` (json)

### 2) Order item fulfillment snapshot

Add immutable per-item snapshot columns to `order_items`:

- `sourceBusinessId` (nullable)
- `sourceBusinessType` (nullable enum)
- `fulfillmentSource` enum:
  - `RESTAURANT_MENU`
  - `MARKET_LINKED`

Rationale:
- Driver UX and analytics should rely on stable order-time facts, not product joins that can change later.

### 3) Optional pickup task table (if needed for clarity)

If route sequencing becomes complex, add computed `order_pickup_tasks` or GraphQL-computed `pickupTasks`:

- `taskType`: `RESTAURANT`, `STOCK`, `MARKET`
- `location`
- `itemSummaries`

## API and Service Plan

### Phase 1 - Guarded linking

1. Tighten `adoptCatalogProduct` validation:
- enforce target business is `RESTAURANT`
- enforce source product belongs to configured source market
- enforce source product category is in allowed beverage set
- enforce idempotency (already present) and soft-delete safety

2. Add admin-only bulk operation:
- `bulkLinkMarketBeveragesToRestaurants(input)`
- links all eligible beverage products to selected restaurants
- supports dry-run mode returning planned inserts/conflicts

3. Add synchronization job/command:
- `syncLinkedBeverageCatalog`
- keeps adopted beverage metadata aligned (name/image/availability) while preserving per-restaurant price override

### Phase 2 - Order creation snapshot and guards

In `OrderCreationModule`:

1. Keep active-order block unchanged.
2. Keep single-business order object unchanged.
3. During item validation, classify each item as `RESTAURANT_MENU` or `MARKET_LINKED`.
4. Persist source snapshot fields on `order_items`.
5. Keep existing inventory coverage logic, which already resolves via `sourceProductId`.

### Phase 3 - Driver payload contract

Add to GraphQL order/item response:

- Item-level `fulfillmentSource`
- Item-level `sourceBusiness` reference (id, name, location)
- Optional order-level `pickupPlan` (grouped by location and task type)

This avoids UI-side guesswork and prevents wrong pickup behavior.

## Driver App Plan (Critical)

### A) Visual instruction model

In all driver surfaces (`home`, pool sheet, detail sheet, drive, navigation card):

Show three explicit sections when present:

1. Pick up at restaurant
- non-linked restaurant menu items

2. Pick from stock
- quantity from inventory coverage (`inventoryQuantity > 0`)

3. Buy from market
- linked beverage remainder not covered by stock
- show market name and address

### B) Action-level guidance

- If market section exists, show a high-priority instruction chip:
  - "Market stop required"
- If both restaurant and market pickups exist, show stop order and completion checklist.

### C) Navigation sequencing

Current navigation state has one pickup then dropoff.

Upgrade path:

1. Extend navigation state to support pickup queue:
- `pickupStops: NavigationDestination[]`
- `currentPickupIndex`

2. New phases:
- `to_pickup_restaurant`
- `to_pickup_market` (repeatable if future multi-market)
- `to_dropoff`

3. If no market pickup needed, phase flow stays restaurant -> dropoff.

### D) Failure-proof UX

- If pickup plan data missing, fallback warning:
  - "Source plan unavailable - verify with order detail"
- Prevent auto-advancing to dropoff while required pickup stops remain incomplete.

## Admin/Operations Workflow

### Initial setup runbook

1. Select source market business.
2. Select beverage categories allowed for linking.
3. Run dry-run bulk link against all restaurants.
4. Execute bulk link.
5. Review conflict report (already adopted, missing categories, deleted products).

### Ongoing maintenance

- Nightly sync for linked beverage metadata.
- New restaurant onboarding triggers auto-link job.
- Dashboard widget:
  - linked beverages count per restaurant
  - broken links
  - out-of-sync products

## Security and Guardrails

1. Mutations are admin-only.
2. Server-side policy check is mandatory at adoption and at order creation validation.
3. Reject manual payload attempts to bypass allowed link policy.
4. Audit log all bulk link operations and policy changes.

## Rollout Strategy

### Feature flags

- `beverageCatalogLinkingEnabled`
- `driverPickupPlanV2Enabled`

### Staged rollout

1. Backend guards + bulk link + snapshots
2. Admin tooling and reporting
3. Driver UI instruction sections
4. Driver navigation pickup queue
5. Production enablement restaurant cohort by cohort

## Testing Plan

### Backend

- unit: adoption guard matrix (allowed/blocked)
- integration: create order with mixed restaurant+linked beverage+inventory split
- integration: cancellation restores stock correctly for linked items
- integration: settlement correctness for linked and stocked portions

### Mobile-driver

- component tests: three-section rendering and chips
- state tests: pickup queue progression and no premature dropoff
- end-to-end manual script:
  - no stock -> market stop required
  - partial stock -> stock + market sections
  - full stock -> no market stop section

### Regression

- legacy non-linked restaurant order unchanged
- direct dispatch flow unchanged
- active-order guard unchanged

## Implementation Sequence (Recommended)

1. Policy schema + guard enforcement in adoption mutation
2. Bulk link mutation and dry-run output
3. Order item source snapshot persistence
4. GraphQL exposure of source/pickup plan
5. Driver UI sections and warning chips
6. Navigation multi-pickup queue
7. Observability + rollout flags + docs

## Acceptance Criteria

1. Restaurants can list the same linked beverage catalog from one designated market.
2. Only the guarded scenario is allowed by backend policy.
3. Customer still places one order; no parallel order model introduced.
4. Driver sees explicit and reliable instructions for restaurant/stock/market pickup split.
5. Navigation can complete required pickup stops before dropoff when market stop exists.
6. Inventory and settlement math remain correct for linked products.
