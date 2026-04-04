# Copilot Instructions — delivery-gjilan

## API Layer (`api/`)

### Repository-First Rule

All database queries against tables with `isDeleted` columns **MUST** go through the repository layer (`api/src/repositories/`). Never import `db` directly in resolvers, routes, or services for these tables.

**Soft-delete tables and their repositories:**
- `promotions` → `PromotionRepository`
- `settlementRules` → `SettlementRuleRepository`
- `products` → `ProductRepository`
- `productCategories` → `ProductCategoryRepository`
- `drivers` → `DriverRepository`
- `optionGroups` → `OptionGroupRepository`
- `options` → `OptionRepository`
- `banners` → `BannerRepository`

**Exception — Dataloaders:** Dataloaders in `api/src/graphql/dataloaders.ts` use `db` directly for batch-loading performance. They must always include `eq(table.isDeleted, false)` in their `where` clause.

**Exception — Historical lookups:** When resolving referenced data for existing records (e.g., product name on an order item), querying without `isDeleted` filter is acceptable because the referenced entity may have been deleted after the record was created.

### How to access repositories

- **In GraphQL resolvers:** Use `ctx.bannerRepository`, `ctx.services.productService`, etc. Repositories are available on the GraphQL context (`api/src/graphql/context.ts`).
- **In services:** Repositories are injected via constructor or created internally. Follow existing patterns in `ProductService`, `BusinessService`, `PromotionService`.
- **In REST routes:** Create repository instances with the `db` import.

### Convention doc

See `api/SOFT_DELETE_CONVENTION.md` for the full soft-delete convention including rules, examples, and the complete table inventory.

### Key architecture patterns

- **GraphQL:** Yoga + Pothos-style codegen. Schema in `api/src/models/`, generated types in `api/src/generated/`.
- **Database:** PostgreSQL via Drizzle ORM. Schema in `api/database/schema/`.
- **Services:** Business logic in `api/src/services/`. Accessed via GraphQL context.
- **Repositories:** Data access in `api/src/repositories/`. One repo per table (for soft-delete tables).
- **Migrations:** Drizzle Kit. Config in `api/drizzle.config.ts`.
