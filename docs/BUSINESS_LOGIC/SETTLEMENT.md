# Settlement

## Current State

The settlement system is one of the most important business domains in the repo and also one of the least settled structurally.

This document is the consolidated operational summary for a domain that has been through multiple analysis and migration passes.

## What The Domain Covers

Settlements model money movement involving:

- drivers
- businesses
- delivered orders
- payable versus receivable directions
- rule-driven calculations

The codebase now includes richer settlement types, rule entities, summaries, snapshots, and calculation metadata in the GraphQL surface.

## API Surface Today

The exposed GraphQL model now treats settlements as a proper rule-driven system rather than a thin payout record.

- `SettlementDirection` distinguishes `PAYABLE` from `RECEIVABLE`
- `SettlementRuleType` supports percentage, fixed-per-order, product-markup, driver-bonus, and custom rules
- `SettlementRule` entities can be created, updated, activated, deactivated, and summarized
- settlement records include calculation metadata, rule snapshots, payment metadata, and richer status fields

The practical consequence is that schema names are ahead of some implementation cleanup. Treat the current API as real, but not yet fully hardened.

## Why It Feels Mid-Refactor

The repo contains both:

- new schema surface and generated types for settlement rules and richer settlement metadata
- TODOs in mutation resolvers that still need stronger authorization and a cleaner final service/repository path

That means the direction is clear, but the implementation still needs hardening before this area is fully trustworthy as a stable architecture.

## Practical Guidance

When working on settlement code:

1. treat the analysis docs as the source of intent
2. treat current resolvers and generated schema as the source of what is actually exposed
3. verify authorization explicitly, especially for admin-only or owner-only actions
4. avoid assuming older settlement docs reflect the latest GraphQL names or enum values

## Relationship To Pricing

Settlement and pricing are coupled but not identical.

- pricing determines what the customer sees and pays
- settlement determines how that money is split and accounted for
- product markup and rule snapshots bridge the two systems

That means pricing changes can have financial consequences even when settlement code is untouched.

## Immediate Cleanup Priorities

- finish authorization checks in settlement rule mutations
- document which settlement paths are production-ready versus still transitional
- reduce confusion between historical docs and current schema names
- make the final service and repository path obvious so mutations do not keep accumulating domain logic in resolvers

## What A Good Final State Looks Like

- one clear rule engine path
- explicit auth policy for every settlement mutation
- well-defined rule types and stacking behavior
- one operational runbook for dispute/debugging scenarios