# Driver Commission Model Recommendations

## Context

Current behavior in settlement calculation applies driver profile commission as a fallback only when no DELIVERY_PRICE settlement rules are selected.

This works, but it can create confusing behavior: adding a DELIVERY_PRICE rule can make per-driver commission stop applying without a clear signal in admin UX.

For admin reads, driver commission and capacity values are resolved from the driver profile row (drivers table) via User field resolvers; if those resolvers are missing, UI can show default values even when database updates are successful.

Order assignments store driver IDs as users.id values, so any settlement lookup against drivers must join/filter by drivers.userId (not drivers.id).

## Recommendation Options

### 1. Rule-Only Model (Most Explicit)

- Represent driver commission fully as settlement rules.
- Remove profile-based fallback commission path.
- Keep one source of truth for commission behavior.

Pros:
- Most auditable and predictable
- One settlement configuration surface
- Lower risk of hidden behavior changes

Cons:
- Requires migration from driver profile commission values
- Needs admin UX for per-driver/global commission rule management

### 2. Hybrid Explicit Pipeline (Recommended Near-Term)

- Keep driver profile commission, but apply it as an explicit base step, not fallback.
- Evaluate rules after base commission with explicit policy:
  - APPLY_BASE (leave base commission as-is)
  - OVERRIDE_BASE (replace base commission)
  - ADDITIVE (add on top of base commission)

Pros:
- Preserves existing admin workflow on the Drivers page
- Removes hidden fallback behavior
- Easier transition toward a pure rule model later

Cons:
- Slightly more complex settlement pipeline
- Needs policy visibility in settlement-rule UI

### 3. Keep Fallback With Guardrails (Lowest Effort)

- Keep current fallback behavior.
- Add clear admin warning when DELIVERY_PRICE rules are active and fallback commission will not apply.
- Add logs/metrics for fallback bypasses.

Pros:
- Lowest engineering cost
- Minimal schema/UI changes

Cons:
- Behavioral complexity remains
- Less explicit than options 1 and 2

## Suggested Direction

Adopt Option 2 first, then evaluate migration to Option 1.

Rationale:
- Preserves current operational workflow and driver-level control.
- Makes settlement outcomes predictable and explainable.
- Creates a clean path to a fully rule-driven architecture later.

## Earnings Preview Wiring

Driver earnings preview should continue to derive from the same settlement calculations pipeline:

- Build settlement entries for the order
- Compute driver take-home as:
  - cash collected
  - plus platform-payable driver entries
  - minus platform-receivable driver entries (including commission)

This keeps operational visibility (admin) and payout visibility (driver app preview) aligned.

## Implementation Notes

- If Option 2 is chosen, document and enforce precedence rules in code and docs.
- Add tests for all three policy modes (APPLY_BASE, OVERRIDE_BASE, ADDITIVE).
- Add one integration test ensuring earnings preview reflects whichever commission policy is active.
