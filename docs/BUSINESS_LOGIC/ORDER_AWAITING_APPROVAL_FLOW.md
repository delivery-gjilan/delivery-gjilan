# Order Placement & Awaiting Approval Flow

## Overview

When a customer places an order that requires manual admin approval, the app must:
1. Show a success screen confirming the order was received
2. Then show an informational modal explaining it is pending approval
3. Show a persistent floating banner while the order is in `AWAITING_APPROVAL` status
4. Auto-close the modal once the admin approves (status transitions to `PENDING` or beyond)

---

## Components & Files

| File | Role |
|------|------|
| `modules/cart/components/CartScreen.tsx` | Places the order, triggers success modal |
| `store/useSuccessModalStore.ts` | Zustand store for the order success/loading modal |
| `components/SuccessModalContainer.tsx` | Renders the opaque full-screen success Modal |
| `components/AwaitingApprovalModalContainer.tsx` | Watches active orders, auto-opens approval modal |
| `components/AwaitingApprovalModal.tsx` | The actual approval info Modal UI |
| `store/useAwaitingApprovalModalStore.ts` | Zustand store: `visible`, `orderId`, `openModal`, `hideModal` |
| `modules/orders/store/activeOrdersStore.ts` | Zustand store holding all active orders |
| `hooks/useActiveOrdersTracking.ts` | Root-level hook: fetches orders + starts subscription |
| `modules/orders/hooks/useOrdersSubscription.ts` | GraphQL subscription that pushes order updates into the store |
| `modules/orders/components/OrdersFloatingBar.tsx` | Persistent floating banner showing active order status |
| `components/FloatingBars.tsx` | Wrapper that mounts both floating bars at root level |

---

## Flow: Order Placement → Awaiting Approval

```
User taps "Place Order" in CartScreen
        │
        ▼
CartScreen.handleCheckout()
  ├─ showLoading('order_created')          → SuccessModalContainer renders loading spinner (opaque Modal)
  ├─ await createOrder(...)                → GraphQL mutation
  ├─ updateActiveOrder(order)              → adds order to activeOrdersStore (status: AWAITING_APPROVAL)
  ├─ showSuccess(orderId, 'order_created') → SuccessModalContainer switches to success animation
  └─ syncActiveOrders(orderId)             → refetches GET_ORDERS, updates activeOrdersStore
        │
        │  [SuccessModalContainer is open — full screen opaque Modal]
        │
        ▼
SuccessModalContainer (4s auto-dismiss or user taps "Track Order")
  └─ hideSuccess() / router.replace(orderId screen)
        │
        ▼  successModalVisible → false
        │
AwaitingApprovalModalContainer (useEffect re-fires)
  ├─ Finds order with status === 'AWAITING_APPROVAL' in activeOrders
  ├─ successModalVisible is now false ✓
  ├─ autoOpenedForRef.current !== orderId ✓
  ├─ Sets autoOpenedForRef.current = orderId
  └─ openModal(orderId) → AwaitingApprovalModal renders (transparent Modal over home screen)
```

---

## Why the success modal must close FIRST

iOS (and Android) can only render **one `<Modal>` at a time**. If `openModal` is called while `SuccessModalContainer` is still on screen, the approval modal silently does not render. The user is left staring at the home screen with no modal and a broken-looking app.

`AwaitingApprovalModalContainer` uses `successModalVisible` as both a guard and a `useEffect` dependency. When the success modal dismisses, `successModalVisible` flips to `false`, the effect re-fires, and the approval modal opens cleanly.

```ts
// AwaitingApprovalModalContainer.tsx
useEffect(() => {
    const awaitingOrder = activeOrders.find(
        (o) => o?.status === 'AWAITING_APPROVAL' && o?.id != null,
    );

    if (awaitingOrder) {
        const orderId = String(awaitingOrder.id);
        if (!visible && !successModalVisible && autoOpenedForRef.current !== orderId) {
            autoOpenedForRef.current = orderId;
            openModal(orderId);
        }
    } else {
        autoOpenedForRef.current = null; // reset for future orders
    }
}, [activeOrders, visible, successModalVisible, openModal]);
```

---

## Awaiting Approval Modal Behavior

| State | Dismiss Button | Button Style | `onRequestClose` (Android back) |
|-------|---------------|--------------|----------------------------------|
| `locked = true` (still AWAITING_APPROVAL) | Shown — grey secondary style | Muted, dismisses info panel only | Calls `hideModal()` |
| `locked = false` (status changed) | Shown — primary color | Full CTA | Calls `hideModal()` |

> **Key design decision:** The modal is always dismissable. When locked, dismissing just closes the info UI — the order itself remains `AWAITING_APPROVAL` and the floating banner stays visible. The user is not trapped.

---

## Auto-Close (Admin Approves the Order)

When an admin approves the order, a subscription event arrives:

```
useOrdersSubscription → updateOrder(order) → activeOrdersStore
        │
        ▼
AwaitingApprovalModalContainer (second useEffect)
  ├─ visible === true
  ├─ modalOrder.status !== 'AWAITING_APPROVAL'  (now 'PENDING' or beyond)
  └─ hideModal()  →  modal closes automatically
```

The `OrdersFloatingBar` also updates instantly since it reads directly from `activeOrdersStore`.

---

## Auto-Open Guard: `autoOpenedForRef`

The ref prevents an infinite open/close loop:

```
openModal() → visible = true
hideModal() → visible = false → effect re-fires
  └─ Without guard: would call openModal() again immediately
  └─ With guard: autoOpenedForRef.current === orderId → skips openModal
```

The ref is reset to `null` only when no AWAITING_APPROVAL order is found, so a brand-new order later in the session will still auto-open.

---

## Floating Banner (OrdersFloatingBar)

- Always mounted at root level via `FloatingBars.tsx` (never unmounts)
- Visibility controlled by animated opacity — `withTiming(0)` (instant hide) / `withTiming(1, 250ms)` (fade in)
- Hides on routes: `/product/`, `/cart`, `/orders`, `/login`, `/signup`, `/auth-selection`, `/profile`, `/addresses`, `/business/`
- When tapped while `isAwaitingApproval === true` → calls `openModal(activeOrderId)` directly (tapping banner manually reopens the info modal even after user dismissed it once)

---

## Real-Time Order Updates

```
Server pushes subscription event (USER_ORDERS_UPDATED)
        │
        ▼
useOrdersSubscription.applyRealtimeOrderUpdate()
  ├─ Updates Apollo cache (GET_ORDERS query watchers re-render)
  └─ Calls activeOrdersStore.updateOrder(order)
        │
        ├─ If status is DELIVERED or CANCELLED → removeOrder() instead
        └─ OrdersFloatingBar re-renders with new status/color/icon
```

---

## Key Invariants

1. **Only one Modal visible at a time** — approval modal waits for success modal to close
2. **Auto-open fires once per orderId** — `autoOpenedForRef` prevents loops
3. **Modal is never inescapable** — dismiss button always rendered; Android back works
4. **Banner never unmounts** — avoids entrance animation replaying on every route change (guarded by `_entranceAnimationPlayed` module-level flag)
5. **autoOpenedForRef resets on order completion** — allows future AWAITING_APPROVAL orders to auto-open normally
