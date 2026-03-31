# Out-of-Zone Orders & Admin Approval

<!-- MDS:B11 | Domain: Backend | Updated: 2026-03-31 -->
<!-- Depends-On: B2, B3, BL1, M4 -->
<!-- Depended-By: (none yet) -->
<!-- Nav: Changes to coverage rules or approval UX → update B2 (Order Creation), M4 (Mobile Order Creation Audit). -->

## Scope

How the backend and admin surfaces behave when a drop-off is outside configured service coverage, and how approval-required orders are surfaced and cleared.

## Service Coverage / Out-of-Zone Flagging

- `OrderService.createOrder` resolves coverage from delivery zones with this priority: service zones (`isServiceZone = true`), else any active zones.
- Orders are **not rejected** when drop-off is outside coverage; instead `locationFlagged` is set and returned on the `Order` type.
- Device location can be out-of-zone while the selected address is inside; user can pick or add any in-zone address (e.g., ordering for a friend in another city). Only the chosen drop-off address is validated.
- After an order is delivered, if the user's default/active address is out-of-zone, the app should prompt them to switch to an in-zone address **only on app re-init / next session**, not immediately upon delivery while they are still in-app.
- Delivery fee still follows the normal zone/distance pricing path (see [B2](ORDER_CREATION.md)).

## Approval Triggers

- Orders enter `AWAITING_APPROVAL` for:
	- First order for the user
	- Order total > €20
	- **Out-of-zone user context:** device/session flagged out-of-coverage at order time, even if drop-off address is in-zone (ops wants a call/confirmation before firing)
- `needsApproval` is `true` for `AWAITING_APPROVAL` orders; businesses do not see these orders until approved.

## Notifications / Alerts

- For approval-required orders, backend sends both `notifyAdminsNewOrder` and `notifyAdminsOrderNeedsApproval` (time-sensitive, relevance 1.0, title "⚠ Order Needs Approval").
- Add a dedicated alert dimension for **out-of-zone user context** (even if drop-off is in-zone) so ops can call/verify before approval. Suggested payload: `reason: 'OUT_OF_ZONE_USER'`, includes user location snapshot + drop-off address.
- Business new-order push is **deferred** until admin approval transitions the order to `PENDING`.

## Admin UI Surfaces (current)

- Order cards show rose "Needs approval" badge and include call-to-verify banner with customer phone.
- Actions: "Approve" on cards and "Approve Order" in detail panel; map detail panel includes "Approve and Send to Business".
- `STATUS_COLORS`/`STATUS_LABELS` include `AWAITING_APPROVAL`.
- `locationFlagged` is available to admin clients for out-of-coverage awareness (order is kept in flow instead of rejected).

## Customer-Facing Behavior

- `AWAITING_APPROVAL` suppresses the out-of-zone modal on mobile customer because the order is treated as active (`useHasActiveOrder`).
- Status label/message reflect pending confirmation: "Your order is pending confirmation — our team will call you shortly." (see [M4](../MOBILE/ORDER_CREATION_AUDIT.md)).

## Operational Notes

- Manual approval is the gate that sends the business intake push and moves order into the normal restaurant/driver pipeline.
- Because out-of-zone orders are accepted and flagged, operations can manually decide to fulfill or cancel after review.

## Implementation TODO (to align with desired flow)

- Enforce approval-required when `locationFlagged = true` **or** device/session is out-of-zone at order time (even if address is in-zone).
- Emit explicit admin alert for out-of-zone context with contact/confirm call-to-action.
- Mobile UX: on next app init/session after a delivery, prompt out-of-zone users to select an in-zone address before starting a new order; allow ordering for others by choosing in-zone drop-off.

## Known Gaps / TODOs

- No dedicated admin alert surface for out-of-zone specifically beyond `locationFlagged` data; consider a filter/badge in orders UI.
- Mobile checkout lacks payment-collection selector (see [M4](../MOBILE/ORDER_CREATION_AUDIT.md)); if added, revalidate approval thresholds and notifications.
