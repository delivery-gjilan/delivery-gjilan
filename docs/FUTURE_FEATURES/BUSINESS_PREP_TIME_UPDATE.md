# Business-Side Prep Time Update (Mid-Order) — Implementation Plan

<!-- MDS:FF6 | Domain: Future Features | Updated: 2026-03-31 -->
<!-- Depends-On: B2, B4, M9 -->
<!-- Nav: Order state machine → B2. Push notifications → M2, O3. Business mobile deep-dive → M9. -->

## Goal

Allow a business to **add extra time** to an order that is currently being prepared (`PREPARING` status), when they realise they can't hit the original ETA. The update should:

1. Extend `preparationMinutes` (and therefore `estimatedReadyAt`) on the order — this already works via the existing `updatePreparationTime` mutation.
2. **Notify the assigned driver** that the pickup ETA has shifted.
3. **Notify the customer** that their order will take a bit longer.
4. **Notify admins** (push + in-app badge/feed) so they have visibility — especially for large delays.
5. Surface a clear **"Add Time"** action in the mobile-business order card UI.

---

## What Already Exists

| Already built | Notes |
|---------------|-------|
| `updatePreparationTime` GraphQL mutation | Works from business or admin role. Updates `preparationMinutes` on the order and emits a `PREP_TIME_UPDATED` order event. Also updates the customer Live Activity. |
| `UPDATE_PREPARATION_TIME` in mobile-business | GraphQL op defined in `mobile-business/graphql/orders.ts` but **not yet wired to a UI button** for an in-progress order. |
| `notifyAdmins()` in `orderNotifications.ts` | General-purpose admin push helper — just needs to be called here. |
| `getTimeRemaining` + countdown timer in order card | Already shows remaining prep time. |

What is **missing**: the UI button, driver notification, customer notification, and admin notification.

---

## Step 1 — API: Notifications in `updatePreparationTime` resolver

File: `api/src/models/Order/resolvers/Mutation/updatePreparationTime.ts`

After the existing Live Activity update, add three fire-and-forget notifications:

### 1a. Notify the customer

```ts
// Notify customer that prep time was extended
notifyCustomerPrepTimeUpdated(
    context.notificationService,
    dbOrder.userId,
    id,
    preparationMinutes,
);
```

Add `notifyCustomerPrepTimeUpdated` to `api/src/services/orderNotifications.ts`:

```ts
export function notifyCustomerPrepTimeUpdated(
    notificationService: NotificationService,
    customerId: string,
    orderId: string,
    newMinutes: number,
): void {
    const payload: NotificationPayload = {
        title: 'Order Update',
        body: `Your order will be ready in about ${newMinutes} minutes.`,
        localeContent: {
            en: {
                title: 'Order Update',
                body: `Your order will be ready in about ${newMinutes} minutes.`,
            },
            al: {
                title: 'Përditësim porosie',
                body: `Porosia juaj do të jetë gati për rreth ${newMinutes} minuta.`,
            },
        },
        data: { orderId, screen: 'order-detail', type: 'PREP_TIME_UPDATED' },
        timeSensitive: false,
        relevanceScore: 0.7,
    };

    notificationService
        .sendToUser(customerId, payload, 'ORDER_STATUS')
        .catch((err) => logger.error({ err, customerId, orderId }, 'Failed to send customer prep-time-updated notification'));
}
```

### 1b. Notify the assigned driver

```ts
if (dbOrder.driverId) {
    notifyDriverPrepTimeUpdated(
        context.notificationService,
        dbOrder.driverId,
        id,
        preparationMinutes,
    );
}
```

Add `notifyDriverPrepTimeUpdated` to `orderNotifications.ts`:

```ts
export function notifyDriverPrepTimeUpdated(
    notificationService: NotificationService,
    driverId: string,
    orderId: string,
    newMinutes: number,
): void {
    const payload: NotificationPayload = {
        title: 'Pickup Time Updated',
        body: `The restaurant has updated the prep time. Ready in ~${newMinutes} min.`,
        localeContent: {
            en: {
                title: 'Pickup Time Updated',
                body: `The restaurant updated the prep time. Ready in ~${newMinutes} min.`,
            },
            al: {
                title: 'Koha e marrjes u përditësua',
                body: `Restoranti e ndryshoi kohën e gatimit. Gati në ~${newMinutes} min.`,
            },
        },
        data: { orderId, screen: 'order-detail', type: 'PREP_TIME_UPDATED' },
        timeSensitive: true,
        relevanceScore: 0.9,
    };

    notificationService
        .sendToUserByAppType(driverId, 'DRIVER', payload, 'ORDER_STATUS')
        .catch((err) => logger.error({ err, driverId, orderId }, 'Failed to send driver prep-time-updated notification'));
}
```

### 1c. Notify admins — only when delay is significant

To avoid admin notification spam on every minor tweak, only notify if the **new time is ≥ 10 minutes more than the original** `preparationMinutes` stored before this update:

```ts
const previousMinutes = dbOrder.preparationMinutes ?? 0;
const delay = preparationMinutes - previousMinutes;

if (delay >= 10) {
    const adminUserIds = await context.orderService.getSuperAdminIds(db);
    notifyAdminsPrepTimeExtended(
        context.notificationService,
        adminUserIds,
        id,
        delay,
        preparationMinutes,
    );
}
```

Add `notifyAdminsPrepTimeExtended` to `orderNotifications.ts`:

```ts
export function notifyAdminsPrepTimeExtended(
    notificationService: NotificationService,
    adminUserIds: string[],
    orderId: string,
    addedMinutes: number,
    newTotalMinutes: number,
): void {
    if (adminUserIds.length === 0) return;

    const payload: NotificationPayload = {
        title: '⏱ Prep Time Extended',
        body: `A business added +${addedMinutes} min to an order (now ${newTotalMinutes} min total).`,
        localeContent: {
            en: {
                title: '⏱ Prep Time Extended',
                body: `A business added +${addedMinutes} min to an order (now ${newTotalMinutes} min total).`,
            },
            al: {
                title: '⏱ Koha e gatimit u zgjat',
                body: `Një biznes shtoi +${addedMinutes} min (gjithsej ${newTotalMinutes} min).`,
            },
        },
        data: { orderId, screen: 'orders', type: 'PREP_TIME_EXTENDED' },
        timeSensitive: false,
        relevanceScore: 0.6,
    };

    notificationService
        .sendToUsersByAppType(adminUserIds, 'ADMIN', payload, 'ADMIN_ALERT')
        .catch((err) => logger.error({ err, orderId }, 'Failed to send admin prep-time-extended notification'));
}
```

**`getSuperAdminIds`** already exists as a pattern in `OrderService.ts` — reuse the same admin-fetch approach used in `createOrder`.

---

## Step 2 — mobile-business: "Add Time" UI on the order card

File: `mobile-business/app/(tabs)/index.tsx`

### 2a. What to show

On a `PREPARING` order card, add an **"Add Time"** button next to the countdown timer. This is a compact action — not a full modal.

Behaviour:
- Tapping shows a **bottom sheet / action sheet** with quick preset additions: `+5`, `+10`, `+15`, `+20`, `+30` minutes, plus a numeric input for custom amounts.
- The new time sent to the mutation is `currentPreparationMinutes + addedMinutes`, clamped to max 180.
- On success: haptic feedback + dismiss sheet + `refetch()`.

### 2b. State additions

```ts
const [addTimeModalOrder, setAddTimeModalOrder] = useState<Order | null>(null);
const [addTimeAmount, setAddTimeAmount] = useState(10);
const [customAddTime, setCustomAddTime] = useState('');
```

### 2c. Handler

```ts
const handleAddTime = async () => {
    if (!addTimeModalOrder) return;
    const customVal = customAddTime.trim() ? Number(customAddTime.trim()) : NaN;
    const extra = Number.isFinite(customVal) && customVal > 0 ? customVal : addTimeAmount;
    const current = addTimeModalOrder.preparationMinutes ?? 20;
    const newTotal = Math.min(180, current + Math.round(extra));

    try {
        await updatePreparationTime({
            variables: { id: addTimeModalOrder.id, preparationMinutes: newTotal },
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAddTimeModalOrder(null);
        setCustomAddTime('');
        refetch();
    } catch (err: any) {
        Alert.alert(t('common.error', 'Error'), err.message);
    }
};
```

Wire `updatePreparationTime` mutation — it is already declared in `mobile-business/graphql/orders.ts` and just needs to be consumed with `useMutation(UPDATE_PREPARATION_TIME)` in the component.

### 2d. Button placement in the order card

In the `PREPARING` section of the card (near the countdown timer row), add a small "Add Time" pill button:

```tsx
{isPreparing && (
    <TouchableOpacity
        onPress={() => {
            setAddTimeModalOrder(order);
            setAddTimeAmount(10);
            setCustomAddTime('');
        }}
        style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.colors.warning + '22',
            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
        }}
    >
        <Ionicons name="add-circle-outline" size={14} color={theme.colors.warning} />
        <Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginLeft: 3 }}>
            {t('orders.add_time', 'Add Time')}
        </Text>
    </TouchableOpacity>
)}
```

### 2e. Bottom sheet modal

Reuse the same pattern as the existing ETA modal (already in the file). Quick preset buttons for `+5 / +10 / +15 / +20 / +30` with a custom input field and a "Confirm" button.

---

## Step 3 — Localisation

### `mobile-business/localization/en.json`

```json
"add_time": "Add Time",
"add_time_title": "Add Preparation Time",
"add_time_subtext": "How many extra minutes does the order need?",
"add_time_confirm": "Add {{minutes}} min",
"add_time_success": "Preparation time updated"
```

### `mobile-business/localization/al.json` (Albanian equivalent)

```json
"add_time": "Shto kohë",
"add_time_title": "Shto kohë gatimi",
"add_time_subtext": "Sa minuta shtesë i nevojiten porosisë?",
"add_time_confirm": "Shto {{minutes}} min",
"add_time_success": "Koha e gatimit u përditësua"
```

---

---

## Step 4 — Admin Panel: Visual Indicator on Orders Page and Map Page

The push notification (Step 1c) is great for alerting an admin who is away from the screen, but admins actively monitoring the orders page or map page should also see a clear **in-UI indicator** on the affected order without having to read a notification.

### Approach — Client-side prep-time-extended tracker

Neither the orders page nor the map page currently subscribe to order events. The simplest non-schema approach is to subscribe to `orderEvent` in both pages and keep a local `Map<orderId, { addedMinutes, newMinutes, at: Date }>` in React state. Indicators auto-clear after 10 minutes (configurable) or on admin dismissal.

#### 4a. New GraphQL subscription in admin panel

Add to `admin-panel/src/graphql/operations/orders/subscriptions.ts` (create if it doesn't exist):

```graphql
subscription AdminOrderEvents {
  orderEvent {
    orderId
    event
    payload
  }
}
```

The `orderEvent` subscription already exists on the API side (`PREP_TIME_UPDATED` event payload includes `{ preparationMinutes, previousMinutes, businessId }`).

#### 4b. Hook — `usePrepTimeAlerts`

Create `admin-panel/src/lib/hooks/usePrepTimeAlerts.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@apollo/client/react';
import { ADMIN_ORDER_EVENTS } from '@/graphql/operations/orders/subscriptions';

export interface PrepTimeAlert {
    orderId: string;
    addedMinutes: number;
    newMinutes: number;
    at: Date;
}

const ALERT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function usePrepTimeAlerts() {
    const [alerts, setAlerts] = useState<Map<string, PrepTimeAlert>>(new Map());
    const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useSubscription(ADMIN_ORDER_EVENTS, {
        onData: ({ data }) => {
            const evt = data?.data?.orderEvent;
            if (!evt || evt.event !== 'PREP_TIME_UPDATED') return;

            const { orderId, payload } = evt;
            const added = (payload?.preparationMinutes ?? 0) - (payload?.previousMinutes ?? 0);
            if (added <= 0) return; // ignore decreases or no-ops

            const alert: PrepTimeAlert = {
                orderId,
                addedMinutes: added,
                newMinutes: payload.preparationMinutes,
                at: new Date(),
            };

            setAlerts((prev) => new Map(prev).set(orderId, alert));

            // auto-clear after TTL
            if (timerRef.current.has(orderId)) clearTimeout(timerRef.current.get(orderId)!);
            timerRef.current.set(
                orderId,
                setTimeout(() => {
                    setAlerts((prev) => {
                        const next = new Map(prev);
                        next.delete(orderId);
                        return next;
                    });
                }, ALERT_TTL_MS),
            );
        },
    });

    const dismiss = (orderId: string) => {
        if (timerRef.current.has(orderId)) clearTimeout(timerRef.current.get(orderId)!);
        setAlerts((prev) => {
            const next = new Map(prev);
            next.delete(orderId);
            return next;
        });
    };

    return { alerts, dismiss };
}
```

#### 4c. Orders page — amber badge on order card

In `admin-panel/src/app/dashboard/orders/page.tsx`:

1. Call `const { alerts: prepAlerts, dismiss: dismissPrepAlert } = usePrepTimeAlerts();` at component level.
2. On the order card (near the prep time / ETA row), conditionally render a badge when `prepAlerts.has(order.id)`:

```tsx
{prepAlerts.has(order.id) && (() => {
    const a = prepAlerts.get(order.id)!;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30 cursor-pointer"
            onClick={() => dismissPrepAlert(order.id)}
            title="Business extended prep time — click to dismiss"
        >
            <Timer className="h-3 w-3" />
            +{a.addedMinutes} min (now {a.newMinutes} min) ×
        </span>
    );
})()}
```

This renders next to the existing `preparationMinutes` display, auto-disappears after 10 min, and can be manually dismissed by clicking ×.

#### 4d. Map page — indicator in the order sidebar panel

The map page already has an order detail sidebar/popover. In `admin-panel/src/app/dashboard/map/page.tsx`:

1. Same hook: `const { alerts: prepAlerts, dismiss: dismissPrepAlert } = usePrepTimeAlerts();`
2. In the order detail panel section (where `preparationMinutes` / ETA is shown), add the same amber badge pattern as 4c.
3. Additionally, flash the **map marker** for the affected order: for 30 seconds after a `PREP_TIME_UPDATED` event, add a pulsing amber ring around the business map pin. Implement by keeping a `Set<string>` of flashing business IDs and clearing with `setTimeout`.

```tsx
// Map marker pulse — add CSS class `animate-pulse ring-amber-400` when orderId is in prepAlerts
<Marker ...>
  <div className={cn(
      "h-8 w-8 rounded-full flex items-center justify-center",
      prepAlerts.has(order.id) ? "ring-2 ring-amber-400 animate-pulse bg-amber-900/60" : "bg-zinc-800"
  )}>
      <Store className="h-4 w-4 text-amber-400" />
  </div>
</Marker>
```

---

## Files to Create / Modify

| Path | Action | Notes |
|------|--------|-------|
| `api/src/models/Order/resolvers/Mutation/updatePreparationTime.ts` | **Modify** | Call 3 new notification helpers; fetch previous minutes before update for delay threshold check |
| `api/src/services/orderNotifications.ts` | **Modify** | Add `notifyCustomerPrepTimeUpdated`, `notifyDriverPrepTimeUpdated`, `notifyAdminsPrepTimeExtended` |
| `mobile-business/app/(tabs)/index.tsx` | **Modify** | Add `addTimeModalOrder` state, `handleAddTime` handler, "Add Time" pill on PREPARING cards, bottom sheet modal |
| `mobile-business/localization/en.json` | **Modify** | Add `add_time*` keys |
| `mobile-business/localization/al.json` | **Modify** | Albanian translations |
| `admin-panel/src/graphql/operations/orders/subscriptions.ts` | **Create** | `AdminOrderEvents` subscription for `orderEvent` |
| `admin-panel/src/lib/hooks/usePrepTimeAlerts.ts` | **Create** | Hook that subscribes to order events and tracks prep-time-extended alerts with auto-clear TTL |
| `admin-panel/src/app/dashboard/orders/page.tsx` | **Modify** | Add `usePrepTimeAlerts`, render amber badge on order cards for recently extended orders |
| `admin-panel/src/app/dashboard/map/page.tsx` | **Modify** | Add `usePrepTimeAlerts`, show amber badge in order sidebar panel, pulse the business map marker |

No DB schema changes required — `preparationMinutes` is already stored on the order.

---

## Notification Decision Matrix

| Recipient | When notified | Condition | Channel |
|-----------|--------------|-----------|---------|
| Customer | Always on prep time update | Any increase | Push (`ORDER_STATUS`) |
| Driver | When driver is assigned | `order.driverId` exists | Push (`ORDER_STATUS`, `DRIVER` app type) |
| Admins | Only on significant delay | `newMinutes - oldMinutes >= 10` | Push (`ADMIN_ALERT`, `ADMIN` app type) |

The 10-minute threshold for admin alerts avoids noise for routine ±1–2 min adjustments.

---

## Validation Checklist (before shipping)

- [ ] Business can add time only to orders they own (`orderContainsBusiness` check already in resolver)
- [ ] New `preparationMinutes` is clamped to 180 (resolver validation already enforces this)
- [ ] Customer receives push with updated ETA — confirmed via test order
- [ ] Customer Live Activity (Dynamic Island) also updates — already handled by `updateLiveActivity` call in the resolver
- [ ] Driver receives push only when a driver is assigned to the order
- [ ] Admin receives push only when delay is ≥ 10 minutes
- [ ] "Add Time" button is visible only on `PREPARING` orders
- [ ] Adding time on a `PENDING` or `READY` order is not possible via this UI path
- [ ] Both Albanian and English localisation strings present
- [ ] Haptic feedback and modal dismiss work correctly on success
