# How Settlements Interact With Promotions and Dynamic Pricing

This document explains how settlement calculations treat dynamic pricing rules and promotions.

Summary
- Dynamic pricing rules (table `dynamic_pricing_rules`) are primarily customer-price adjustments.
- Per-business per-product FIXED_AMOUNT overrides are treated as additional platform markup for settlement purposes (platform receives the override amount).
- Promotions that give free delivery may trigger driver compensation rules; driver free-delivery compensation remains unchanged.

Behavior Details

1) Dynamic pricing rules
- Stored in `dynamic_pricing_rules` with `adjustmentConfig`.
- Supported adjustment types: `PERCENTAGE`, `FIXED_AMOUNT`, `MULTIPLIER`.
- Admin UI may include `adjustmentConfig.overrides = [{ productId, amount }]` for business-scoped rules to specify per-product fixed increments.

2) How settlement uses overrides
- During order settlement, the `SettlementCalculationEngine` loads product pricing from `product_pricing` (fields: `businessPrice`, `platformMarkup`).
- It then queries active `dynamic_pricing_rules` scoped to the order's business (or global rules) and collects any `FIXED_AMOUNT` rules that include `overrides` for the ordered products and are active within the rule's validity window.
- Per-product override amounts are summed (if multiple matching rules exist) and treated as additional platform markup when computing settlement.
  - Business receives its `businessPrice * quantity` as before.
  - Platform receives `platformMarkup * quantity + overrideAmount * quantity`.
- This preserves the principle that dynamic customer-price increases that are configured as per-product fixed increments are considered platform revenue unless a specific settlement rule redistributes them.

3) Promotions (e.g., free delivery)
- Promotions that discount delivery may result in a free delivery for the customer.
- For free-delivery orders, driver compensation is determined by settlement rules scoped to drivers (legacy `PERCENTAGE` on `DELIVERY_FEE` or explicit `FREE_DELIVERY` rules).
- The engine selects the most specific applicable free-delivery compensation rule (business-scoped and promo-scoped rules are preferred).

4) Notes and future considerations
- Currently `PERCENTAGE` dynamic adjustments and `MULTIPLIER` are not converted into settlement-affecting platform markup. If you want those to affect settlements, we should define share semantics explicitly (e.g., split percentage increase between business/platform).
- The current implementation treats per-product FIXED_AMOUNT overrides as fully platform revenue. If you want businesses to share in those overrides, add explicit settlement rules (e.g., `PRODUCT_MARKUP` or business-scoped `PERCENTAGE` rules) that apply to the override amounts.
- Condition evaluation is limited: rules must be active (`isActive`) and within `validFrom`/`validUntil` to apply; more elaborate condition evaluation (TIME_OF_DAY, DEMAND, WEATHER) can be added to the pricing engine to match runtime order conditions.

Files touched
- `api/src/services/SettlementCalculationEngine.ts` — now collects per-product fixed overrides and applies them as platform markup during business settlement.
- `admin-panel/src/app/admin/financial/dynamic-pricing/page.tsx` — admin UI writes `adjustmentConfig.overrides` when creating business-scoped per-product fixed overrides.

Questions
- Do you want `PERCENTAGE` or `MULTIPLIER` dynamic adjustments to also affect settlement shares? If so, specify desired split between business and platform.
- Should overrides ever be split to businesses (instead of platform-only), or should that be handled by explicit settlement rules?
