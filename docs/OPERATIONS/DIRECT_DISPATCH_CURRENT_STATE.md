# Direct Dispatch — Current State (O22)

**MDS ID:** O22  
**Last updated:** 2026-04-15  
**Scope:** Backend/API, mobile-business, mobile-driver, admin-panel

---

## Purpose

Document the current production behavior of Direct Dispatch and the cross-surface changes that were implemented.

---

## Implemented Backend Behavior

Service: `api/src/services/DirectDispatchService.ts`

- `checkAvailability(businessId)` validates global + per-business feature gates.
- `createOrder(input, requestingUserId)` creates an `orders` row with:
  - `channel = DIRECT_DISPATCH`
  - `recipientPhone`, `recipientName`
  - fixed fee from business-level `directDispatchFixedAmount` stored in `deliveryPrice`
  - `status = PREPARING`
  - `preparationMinutes`, `preparingAt`, `estimatedReadyAt`
  - dropoff coordinates/address from request input

- The mutation schedules early dispatch using the submitted preparation minutes.
- When the order later becomes `READY`, the normal READY dispatch path still re-runs as needed.

### Availability Formula (current)

`freeDriverCount` counts only drivers that are:
- `onlinePreference = true`
- `connectionStatus = CONNECTED`
- below `maxActiveOrders` by assigned active orders

Not applied in the current formula:
- store reserve subtraction
- pending unassigned order subtraction

Background tolerance:
- `CONNECTED` and `STALE` are treated as available when online preference is on
- `DISCONNECTED` may still count during a short heartbeat grace window
- `LOST` is excluded

---

## Implemented mobile-business Behavior

- Orders screen has a Direct Dispatch FAB (phone icon, bottom-right).
- FAB visibility requires both:
  - global `storeSettings.directDispatchEnabled`
  - per-business `business.directDispatchEnabled`
- The orders screen keeps global direct-dispatch state fresh via `storeStatusUpdated`, so when ops turns the feature off globally the Direct Call control disappears without waiting for a manual refresh.
- The business-level gate is refreshed by the `businessUpdated(id)` subscription, so admin changes to a specific business hide the control and close any open request modal immediately after the update lands.
- `DirectDispatchSheet` is presented as a full-screen request modal, checks availability, shows free-driver status, and submits `createDirectDispatchOrder`.
- The modal collects preparation minutes so early dispatch timing can be scheduled from the request.
- The modal no longer shows the fixed amount.
- Direct-dispatch orders are visually tagged as Direct Call in order cards.
- `OUT_FOR_DELIVERY` stays in upcoming/active list to preserve direct-call operational visibility.

---

## Implemented mobile-driver Behavior

- Driver order operations include `channel`, `recipientPhone`, `recipientName`.
- Direct-dispatch visuals:
  - `OrderAcceptSheet`: Direct Call badge + recipient label
  - `OrderPoolSheet`: orange accent + Direct Call badge
  - `OrderDetailSheet`: Direct Call badge + recipient-based identity

---

## Implemented admin-panel Behavior

- Order queries/subscriptions include `channel`, `recipientPhone`, `recipientName`.
- Orders list + order detail show Direct Call context, recipient info, business name, and agreed amount.
- Per-business Direct Dispatch settings exist in both business edit flows:
  - `EditBusinessModal` (list page)
  - `EditBusinessDetailModal` (detail page)
  - includes `directDispatchEnabled` and `directDispatchFixedAmount`
- Global Direct Dispatch control in the topbar opens a rollout modal:
  - confirms whether global direct dispatch should be switched on or off
  - lets admin choose which businesses to apply the per-business toggle to
  - when enabling selected businesses without a fixed amount, opens a second modal requiring fixed-amount entry before applying changes

---

## Related MDS Files

- `docs/FUTURE_FEATURES/BUSINESS_DISPATCH.md`
- `docs/MOBILE/BUSINESS_APP.md`
- `docs/MOBILE/DRIVER_APP.md`
- `docs/WEB/ADMIN_PANEL_APP.md`
