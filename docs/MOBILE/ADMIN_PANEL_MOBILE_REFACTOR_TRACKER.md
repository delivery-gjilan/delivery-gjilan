# Admin Panel To Mobile Refactor Tracker

<!-- MDS:M6 | Domain: Mobile | Updated: 2026-03-19 -->
<!-- Depends-On: UI1, UI2, M1 -->
<!-- Depended-By: M1 -->
<!-- Nav: Any admin-panel UX/role/permissions/filters update -> update this file in same PR. -->

## Purpose

This is a living parity tracker so `mobile-business` and `mobile-admin` can mirror `admin-panel` behavior when we run mobile refactor work.

Use this as the single source of truth for:

- what changed in admin-panel
- what mobile surfaces must match
- what is pending vs done
- implementation order and acceptance criteria

## Source Of Truth

Primary web source docs:

- `docs/ADMIN_MOBILEBUSINESS_UI_CONTEXT.md` (UI1)
- `docs/ADMIN_PANEL_BUSINESS_SETTLEMENTS.md` (UI2)

Primary mobile source docs:

- `docs/MOBILE/OVERVIEW.md` (M1)

## Mapping Matrix

| Admin-panel area | Mobile target | Current status | Notes |
|---|---|---|---|
| Business settlements (`/dashboard/business-settlements`) | `mobile-business` finances tab | Partial | Filters and reasoning exist, but must align exactly with web semantics and date modes. |
| Settlement order details modal | `mobile-business` settlement detail screen/sheet | Partial | Ensure business-scoped item breakdown and fallback behavior are mirrored. |
| Admin orders earnings signal (`/dashboard/orders`) | `mobile-admin` orders list/detail | Planned | Add `+earnings` indicator and breakdown (delivery commission, restaurant commission, markup), with business commission sourced from active settlement rules and delivery included only after driver assignment/out-for-delivery (`DEL+` marker). |
| Business products/categories sorting and actions | `mobile-business` products flow | Partial | Keep sort persistence and role-specific affordances consistent with web constraints. |
| Super-admin financial ops (`/admin/financial/*`) | `mobile-admin` financial module | Planned | Keep clearly separate from business flows; no mixed semantics. |
| Role-based nav separation (business vs admin) | `mobile-business` vs `mobile-admin` app shells | Planned | No cross-role leakage in nav or screens. |

## Current Parity Backlog

### P0 (must match first)

1. Business settlements filter parity in `mobile-business`:
   - Add/verify date modes: `all`, `today`, `this week`, `this month`, `from last settlement`, `custom`.
   - Keep status, direction, search behavior consistent with web.

2. Settlement semantics parity:
   - `RECEIVABLE` and `PAYABLE` wording and arithmetic must match UI2 formulas.
   - Reason labels must stay business-facing and unambiguous.

3. Order detail parity for settlement rows:
   - On-demand fetch only when opening details.
   - Business-scoped item rendering first.
   - Historical fallback behavior should not produce blank content.

4. Permission parity:
   - Business employee must honor `view_finances` constraints in UX access points.

### P1 (next)

1. `mobile-admin` financial operations parity with `/admin/financial/*` flows.
2. `mobile-admin` orders parity for earnings motivation signal (`+X`) and breakdown transparency.
3. Shared visual language cleanup between web and mobile for finance states:
   - pending/paid/overdue/cancelled chips
   - empty/error/loading states
4. Shared copy parity pass for settlement labels.

### P2 (polish)

1. CSV/export/report parity decisions.
2. Advanced filter persistence behavior parity.

## Implementation Protocol

For every admin-panel PR touching business/admin finance UX:

1. Add a short entry under `Change Log` below.
2. Update Mapping Matrix statuses.
3. Add or adjust backlog items if parity risk changed.
4. Link touched files in web and expected mobile targets.

For every mobile parity PR:

1. Mark relevant backlog item done.
2. Add acceptance notes and any known deltas.
3. If parity is intentionally deferred, record reason and owner.

## Acceptance Checklist (per feature)

1. Role access matches web intent.
2. Filters match web behavior and naming.
3. Financial math and reason labels match UI2 semantics.
4. Detail loading strategy remains on-demand.
5. Error/empty states are explicit and actionable.

## Change Log

- 2026-03-19: Mobile-business finances now mirror web settlement semantics (`RECEIVABLE` commission vs `PAYABLE` payout net) and use a mobile table-style row layout instead of card rows.
- 2026-03-19: Admin orders earnings now derive business commission from active settlement rules to match finance configuration (not only business profile percentage).
- 2026-03-19: Updated admin orders earnings behavior to include delivery commission conditionally (driver assigned/out-for-delivery), with explicit `DEL+` marker and overlay tooltip behavior that does not stretch rows.
- 2026-03-19: Added admin orders `+earnings` indicator (delivery commission + restaurant commission + markup) to web orders table and order details; mobile-admin parity requirement added.
- 2026-03-19: Admin financial settlements tables (`/admin/financial/settlements`) were restyled to match business settlements table language; mobile finance screens should mirror the updated table state chips, row density, and action affordances.
- 2026-03-19: Initialized tracker after dedicated business settlements separation in admin-panel, to drive upcoming `mobile-business` and `mobile-admin` parity refactor.