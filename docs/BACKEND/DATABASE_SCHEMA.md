# Database Schema Reference

<!-- MDS:B7 | Domain: Backend | Updated: 2026-03-18 -->
<!-- Depends-On: B1 -->
<!-- Depended-By: B2, B5, B6, BL1, BL2 -->
<!-- Nav: Any schema change (new table, new column, migration) → update this file and the relevant domain MDS. Settlement tables → BL1. Auth tables → B5. Pricing tables → B6. Order tables → B2. -->

## Overview

All tables are defined in `api/database/schema/` as Drizzle ORM table definitions. New tables must be exported from `api/database/schema/index.ts`.

**Migration commands:**
```bash
npm run db:generate   # generate migration SQL from schema changes
npm run db:migrate    # apply pending migrations
npm run db:studio     # open Drizzle Studio at https://local.drizzle.studio
```

---

## Tables by Domain

### Auth & Users

| Table | File | Notes |
|-------|------|-------|
| `users` | `users.ts` | Roles: CUSTOMER, DRIVER, BUSINESS_OWNER, BUSINESS_EMPLOYEE, ADMIN, SUPER_ADMIN. Soft delete via `deleted_at`. |
| `refresh_token_sessions` | `refreshTokenSessions.ts` | Hashed refresh tokens; one row per active session. Supports multi-device. |
| `user_permissions` | `userPermissions.ts` | Granular role-based permission rules. |
| `referrals` | `referrals.ts` | Tracks referrer → referred user relationships. |

**Key `users` fields:**

| Column | Notes |
|--------|-------|
| `signup_step` | INITIAL → EMAIL_SENT → EMAIL_VERIFIED → PHONE_SENT → COMPLETED |
| `role` | CUSTOMER, DRIVER, BUSINESS_OWNER, BUSINESS_EMPLOYEE, ADMIN, SUPER_ADMIN |
| `business_id` | FK to businesses; required for BUSINESS_* roles |
| `flag_color` | Admin moderation flag (yellow default) |
| `referral_code` | Unique, nullable |
| `deleted_at` | Soft delete timestamp |

---

### Businesses & Catalog

| Table | File | Notes |
|-------|------|-------|
| `businesses` | `businesses.ts` | Soft delete via `deleted_at`. Location, hours, type (RESTAURANT etc). |
| `business_hours` | `businessHoursRepository.ts` | Weekly schedule; `opens_at`/`closes_at` in **minutes from midnight**. Atomic replace strategy. |
| `store_settings` | `storeSettings.ts` | Per-store configuration flags. |
| `product_categories` | `productCategories.ts` | Top-level categories; hard delete cascades to products. |
| `product_subcategories` | `productSubcategories.ts` | Subcategories; hard delete sets `product.subcategory_id = null`. |
| `product_variant_groups` | `productVariantGroups.ts` | Groups variants of same base item. |
| `products` | `products.ts` | See pricing fields below. FK: businessId, categoryId, subcategoryId, groupId. |
| `option_groups` | `optionGroups.ts` | Named groups of options (e.g., "Size", "Toppings"). |
| `options` | `options.ts` | Individual option choices; each has a price delta. |
| `product_pricing` | `productPricing.ts` | Business/platform price split + pricing history JSONB. Not yet live in PricingService. |
| `dynamic_pricing_rules` | `productPricing.ts` | Condition-based price adjustment rules (schema only; not evaluated yet). |
| `banners` | `banners.ts` | Promotional banners shown in the customer app. |

**Key `products` pricing fields:**

| Column | Description |
|--------|-------------|
| `base_price` | Default customer price |
| `markup_price` | Driver markup (used by settlement engine, not charged to customer) |
| `night_marked_up_price` | Price from 23:00–05:59 |
| `is_on_sale` | When true, `sale_price` overrides everything |
| `sale_price` | Active sale price |
| `is_available` | False hides from ordering |
| `sort_order` | Display order |

---

### Orders

| Table | File | Notes |
|-------|------|-------|
| `orders` | `orders.ts` | Master order record. `payment_collection`: CASH_TO_DRIVER \| PREPAID_TO_PLATFORM. |
| `order_items` | `orderItems.ts` | Line items. `base_price` at time of order, `final_applied_price` after promo. |
| `order_item_options` | `orderItemOptions.ts` | Selected option per line item (FK to optionGroups + options). |
| `order_promotions` | `orderPromotions.ts` | Promotions applied to an order. `applies_to`: PRICE \| DELIVERY. |

**Order status enum:**
`PENDING → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED | CANCELLED`

**Payment collection enum:**
- `CASH_TO_DRIVER` — customer pays driver directly; driver owes platform markup remittance
- `PREPAID_TO_PLATFORM` — customer pays platform; no driver remittance settlement

---

### Promotions & Financial

| Table | File | Notes |
|-------|------|-------|
| `promotions` | `promotions.ts` | 6 types: FIXED_AMOUNT, PERCENTAGE, FREE_DELIVERY, SPEND_X_GET_FREE, SPEND_X_PERCENT, SPEND_X_FIXED. |
| `promotion_redemptions` | `promotionRedemptions.ts` | Per-user redemption log. |
| `promotion_business_eligibility` | `promotionBusinessEligibility.ts` | Restrict promo to specific businesses. |
| `user_promotions` | `userPromotions.ts` | Assign promos to specific users. |
| `user_promo_metadata` | `userPromoMetadata.ts` | Per-user stats (first-order-promo-used, total-savings). |
| `settlements` | `settlements.ts` | DRIVER \| BUSINESS, RECEIVABLE \| PAYABLE. Lifecycle: PENDING → PAID/OVERDUE/CANCELLED/DISPUTED. |
| `settlement_rules` | `settlementRules.ts` | Admin-configured commission rules. Scoped: global, business, promotion, or both. |

---

### Drivers

| Table | File | Notes |
|-------|------|-------|
| `drivers` | `drivers.ts` | `connection_status`: CONNECTED, STALE, LOST, DISCONNECTED. Throttled location writes (5m min distance, 10s interval). |

---

### Notifications & Device Health

| Table | File | Notes |
|-------|------|-------|
| `device_tokens` | `deviceTokens.ts` | FCM/APNs tokens. `app_type`: CUSTOMER, DRIVER. (BUSINESS, ADMIN not covered yet.) |
| `notifications` | `notifications.ts` | Sent notification records. |
| `notification_campaigns` | `notificationCampaigns.ts` | Batch campaign definitions. |
| `push_telemetry_events` | `pushTelemetryEvents.ts` | Push delivery tracking events. |
| `business_device_health` | `businessDeviceHealth.ts` | Business app heartbeat / device health metrics. |
| `live_activity_tokens` | `liveActivityTokens.ts` | iOS Live Activity push tokens (one per active order). |

---

### Customer Data

| Table | File | Notes |
|-------|------|-------|
| `user_address` | `userAddress.ts` | Saved delivery addresses. `is_default` flag. |
| `user_behaviors` | `userBehaviors.ts` | Behavioral analytics: `totalOrders`, `totalSpend`, `firstOrderAt`, `lastOrderAt`, `lastDeliveredAt`, etc. Used by notification query builder. |

---

### Delivery Pricing

| Table | File | Notes |
|-------|------|-------|
| `delivery_zones` | `deliveryZones.ts` | Polygon-based zones with fixed delivery fee. Takes priority over tiers. |
| `delivery_pricing_tiers` | `deliveryPricingTiers.ts` | Distance-based fee ranges. `max_distance_km = NULL` = unlimited. |

---

### Audit

| Table | File | Notes |
|-------|------|-------|
| `audit_logs` | `auditLogs.ts` | Tracks all significant actions. Actor types: ADMIN, BUSINESS, DRIVER, CUSTOMER, SYSTEM. ~40 action types across users, products, orders, settlements, drivers. Metadata JSONB for old/new values. |

**Indexed columns in audit_logs:**
- `actor_id`
- `(entity_type, entity_id)` composite
- `created_at`

---

## Index File

`api/database/schema/index.ts` must export every schema file. When adding a new table, add the export here or migrations and Drizzle queries will not find it.

---

## Naming Conventions

| Concern | Convention |
|---------|-----------|
| Table names | `snake_case`, plural (e.g., `order_items`) |
| Column names | `snake_case` |
| Primary keys | `uuid` with `defaultRandom()` |
| Timestamps | `created_at`, `updated_at` (with timezone), auto-managed |
| Soft delete | `deleted_at` timestamp (currently: users, businesses) |
| Hard delete | product categories, subcategories, products, orders |
| Enums | Defined in schema file, exported, aligned with GraphQL generated types |
