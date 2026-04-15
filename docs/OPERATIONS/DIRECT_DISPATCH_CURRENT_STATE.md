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
  - `status = READY`
  - dropoff coordinates/address from request input

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
- `DirectDispatchSheet` checks availability, shows free-driver status, and submits `createDirectDispatchOrder`.
- Sheet shows the admin-configured fixed amount for that business (read-only in mobile-business).
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
- Global Direct Dispatch toggle exists in topbar store settings controls.

---

## Related MDS Files

- `docs/FUTURE_FEATURES/BUSINESS_DISPATCH.md`
- `docs/MOBILE/BUSINESS_APP.md`
- `docs/MOBILE/DRIVER_APP.md`
- `docs/WEB/ADMIN_PANEL_APP.md`
