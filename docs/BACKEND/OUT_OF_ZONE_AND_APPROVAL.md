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
- `locationFlagged` is computed from both points:
	- selected drop-off location
	- optional user-context location captured from the mobile device/session at checkout (`userContextLocation`)
- If either point is outside coverage, the order is flagged and enters approval flow.
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
- Business new-order push is **deferred** until admin approval transitions the order to `PENDING`.

## Admin UI Surfaces

### Approval Badges

Flagged orders surface on both the **Orders page** and **Map page** with contextual badges:

| Badge | Color | Condition |
|---|---|---|
| 🆕 First order | Blue | Customer has no previous orders (`FIRST_ORDER` reason) |
| 💰 Over €20 | Amber | Order total > €20 (`HIGH_VALUE` reason, re-derived from `totalPrice`) |
| 📍 Outside delivery zone | Orange | `locationFlagged = true` (persisted DB column) |

> `approvalReasons` is not a persisted DB column. On order load it is re-derived in `mapToOrder` from: earliest order id per user (`FIRST_ORDER`), persisted `locationFlagged` (`OUT_OF_ZONE`), and `actualPrice + deliveryPrice` (`HIGH_VALUE`).

### Approval Flow

1. Admin sees a flagged order card with rose "Awaiting Approval" badge on the **Orders page** or in the **Map page** sidebar.
2. For newly created flagged orders, the approval modal opens automatically for admins on both surfaces.
3. Admin can click **✓ Approve** (card) or **Approve Order** (detail panel / map sidebar).
4. The **Approval Confirmation Modal** shows:
   - Order summary (displayId, customer name, total)
   - All applicable reason flags (First order / High value / Outside zone)
   - Explanatory copy: "Confirm you have called/verified…"
5. If the modal is dismissed without approval, focusing the same flagged order card/detail opens the modal again until approval is completed.
6. Admin clicks **✓ Approve & Send to Business**.
7. `approveOrder` mutation fires → `AWAITING_APPROVAL → PENDING` → businesses are notified via push.

### `approveOrder` Mutation

- `api/src/models/Order/resolvers/Mutation/approveOrder.ts`
- Auth: `ADMIN` or `SUPER_ADMIN` only.
- Validates order is in `AWAITING_APPROVAL`.
- Calls `orderService.updateOrderStatus(id, 'PENDING', true)`.
- Publishes user order subscription, all-orders subscription, and sends `notifyBusinessNewOrder` to all businesses on the order.

### Subscription / Real-time

- `allOrdersUpdated` subscription selection set includes `needsApproval`, `locationFlagged`, `approvalReasons` — map page receives live updates without refresh.
- `GET_ORDERS` query also includes all three fields — orders page initial load reflects them.

## Customer-Facing Behavior

- Out-of-zone modal is evaluated once on app init after zone + order state resolve; it is not re-opened on mid-session order status transitions.
- `AWAITING_APPROVAL` suppresses the out-of-zone modal on mobile customer because the order is treated as active (`useHasActiveOrder`).
- Status label/message reflect pending confirmation: "Your order is pending confirmation — our team will call you shortly." (see [M4](../MOBILE/ORDER_CREATION_AUDIT.md)).

## Operational Notes

- Manual approval is the gate that sends the business intake push and moves order into the normal restaurant/driver pipeline.
- Because out-of-zone orders are accepted and flagged, operations can manually decide to fulfill or cancel after review.

## Known Gaps / TODOs

- No dedicated admin alert surface for out-of-zone specifically beyond `locationFlagged` data; consider a filter/badge in orders UI.
- Mobile checkout lacks payment-collection selector (see [M4](../MOBILE/ORDER_CREATION_AUDIT.md)); if added, revalidate approval thresholds and notifications.
