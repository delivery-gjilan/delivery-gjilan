# Pricing And Promotions

## Pricing Model

The platform currently uses a layered pricing model.

- businesses set the base product price
- the platform can apply a markup on top of that business price
- dynamic pricing rules can add conditional adjustments

In plain terms:

`customer price = business price + platform markup + dynamic adjustments`

This is why pricing changes are not just UI tweaks. They affect settlement inputs, customer-visible totals, and reporting.

## Where The Logic Lives

- product and pricing schema live in the API GraphQL modules
- dynamic pricing rules are exposed through dedicated rule queries and mutations
- admin pricing workflows live in the finance area of the admin panel
- generated GraphQL clients mirror this schema across admin and mobile apps

## Dynamic Pricing

Dynamic pricing is optional and rule-based.

- condition types include time-based and custom conditions
- adjustments can be percentage, fixed amount, or multiplier
- rules can be scoped by business and product applicability
- the system stores adjustment configuration and applicability separately, which is useful but means schema churn propagates widely

## Promotions

Promotions are a separate discount system, not a synonym for dynamic pricing.

- promotions can be manual code entry or auto-apply
- promotions can be targeted to specific users
- first-order and date-window logic are already part of the model
- applicable promotions and validation are exposed through dedicated GraphQL queries

## Auto-Apply And Targeting

Operationally, the useful promotion capabilities are:

- auto-apply discounts without customer code entry
- user-targeted promos for VIP, referral, or testing use cases
- threshold and eligibility queries that let the client explain why a promo applies or not

This is strong product behavior, but it increases the need for clear authorization and auditability on the admin side.

## Admin Responsibilities

The admin panel should be treated as the source of controlled configuration for:

- platform markups
- dynamic pricing rules
- promotion activation and targeting
- reason capture for pricing changes

If a pricing change path bypasses the admin flow, it should still preserve audit clarity.

## Current Risks

- authorization TODOs still exist around some pricing and rule mutation paths
- schema and generated clients have grown faster than the docs in this area
- pricing and settlement are easy to conflate, which leads to wrong assumptions during refactors

## Recommended Cleanup

- finish auth hardening on pricing and settlement-rule mutations
- keep pricing terminology strict: business price, platform markup, dynamic pricing, promotion
- add focused tests around auto-apply and targeted-user promotion behavior