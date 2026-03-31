# Push Notifications & Live Activity — Refactor Plan

<!-- MDS:M12 | Domain: Mobile | Updated: 2026-03-31 -->
<!-- Depends-On: M2, M9, O3 -->
<!-- Nav: Live Activity behaviour → LIVE_ACTIVITY_BEHAVIOR.md (M10). Push telemetry → PUSH_NOTIFICATION_TELEMETRY.md (M11). Architecture → ARCHITECTURE.md (A1). -->

This document is the single source of truth for:
1. A complete audit of every push notification and Live Activity in the system
2. Planned copy / content improvements
3. Planned app-icon / notification-icon improvements so branded logo appears on each push

---

## 1. Push Notification Inventory

All notifications originate from `api/src/services/orderNotifications.ts` and reach devices through `NotificationService.sendMulticast` via Firebase Cloud Messaging.

### 1a. Customer App (`mobile-customer`)

| ID | Trigger | Category | Title (current) | Body (current) | Time-Sensitive | Interactive Actions |
|----|---------|----------|-----------------|----------------|----------------|---------------------|
| C1 | `PREPARING` status | `ORDER_STATUS` | `Order Accepted! 🎉` | `Your order has been accepted and is being prepared.` | No | — |
| C2 | `OUT_FOR_DELIVERY` status | `ORDER_STATUS` | `On the Way! 🚗` | `Your order is on its way to you!` | **Yes** | `order-on-the-way` → 📍 Track Order |
| C3 | `DELIVERED` status | `ORDER_STATUS` | `Delivered! ✅` | `Your order has been delivered. Enjoy!` | **Yes** | `order-delivered` → ⭐ Rate Order · 💵 Add Tip · 💬 Support |
| C4 | `CANCELLED` status | `ORDER_STATUS` | `Order Cancelled` | `Your order has been cancelled.` | **Yes** | `order-cancelled` → 💬 Contact Support |
| C5 | Driver ETA < 3 min | `ORDER_STATUS` | `Driver is almost there` | `Your driver is about X minutes away.` | **Yes** | `order-on-the-way` → 📍 Track Order |
| C6 | Driver arrived & waiting | `ORDER_STATUS` | `Driver is waiting outside` | `Your driver has arrived and is waiting for you.` | **Yes** | `order-on-the-way` → 📍 Track Order |

### 1b. Driver App (`mobile-driver`)

| ID | Trigger | Category | Title (current) | Body (current) | Time-Sensitive |
|----|---------|----------|-----------------|----------------|----------------|
| D1 | Admin assigns order | `ORDER_ASSIGNED` | `New Order Assigned! 🚀` | `New delivery from {address}. Tap to view details.` | — |
| D2 | Admin re-assigns away | `ORDER_REASSIGNED` | `Order Reassigned` | `An admin has reassigned one of your orders.` | **Yes** |
| D3 | New order ready for pickup (wave 1) | `ORDER_READY_POOL` | `New Order Available! 📦` | `Order from {businessName} is ready for pickup.` | **Yes** |
| D4 | Expanded wave when wave 1 ignores | `ORDER_READY_POOL` | `Order Still Available 📦` | `An order is waiting for pickup. Tap to claim it.` | **Yes** |
| D5 | Admin direct message | `ADMIN_ALERT` | `💬 New Message` / `⚠️ Warning from Admin` / `🚨 Urgent Message` | Admin-authored body text | Depends on alertType |

### 1c. Business App (`mobile-business`)

| ID | Trigger | Category | Title (current) | Body (current) | Time-Sensitive |
|----|---------|----------|-----------------|----------------|----------------|
| B1 | New order placed | `ORDER_STATUS` | `New Order for Your Business` | `You have a new incoming order. Tap to view details.` | **Yes** |
| B2 | Admin direct message | `ADMIN_ALERT` | `💬 New Message` / `⚠️ Warning from Admin` / `🚨 Urgent Message` | Admin-authored body text | Depends on alertType |

### 1d. Admin App / Panel (`mobile-admin`)

| ID | Trigger | Category | Title (current) | Body (current) | Time-Sensitive |
|----|---------|----------|-----------------|----------------|----------------|
| A1 | New order placed | `ADMIN_ALERT` | `New Order Received` | `A new order was placed. Tap to review it in admin.` | **Yes** |
| A2 | Order needs approval | `ADMIN_ALERT` | `⚠ Order Needs Approval` | `An order requires your review before it can proceed.` | **Yes** |
| A3 | Business extends prep time ≥ 10 min (planned — FF6) | `ADMIN_ALERT` | `⏱ Prep Time Extended` | `A business added +X min to an order (now Y min total).` | No |

---

## 2. Live Activity (Dynamic Island) Inventory

Live Activity is **iOS 16.1+ only**, customer-facing. Implemented via WidgetKit (`DeliveryLiveActivityWidget`) + APNs `liveactivity` pushes from the backend.

### 2a. Lifecycle

| Event | Trigger | What changes |
|-------|---------|-------------|
| **Started** | `PREPARING` status, JS-side `useBackgroundLiveActivity` | New activity created; `status = preparing`, `estimatedMinutes = preparationMinutes`, `driverName = "Your driver"` |
| **Updated — heartbeat** | Every 60 s while `OUT_FOR_DELIVERY` | `estimatedMinutes` decremented by real driver ETA |
| **Updated — status change** | Any status transition | `status`, `driverName`, `estimatedMinutes`, `phaseInitialMinutes`, `phaseStartedAt` refreshed |
| **Ended** | `DELIVERED` or `CANCELLED` | End event sent, content freezes for 10 s then dismissed |

### 2b. Lock Screen Widget UI

| Region | Content |
|--------|---------|
| Top-left | Business name (`context.attributes.businessName`) |
| Top-right | ETA countdown (`~Xm`) or status label (`Done`, `Waiting`, etc.) |
| Middle-left | SF Symbol icon + status text (e.g. `fork.knife · Preparing`) |
| Progress bar | Linear, tinted by status colour; hidden for `pending`/`cancelled` |
| Bottom-left | `Order #XXXX` |
| Bottom-right | Driver name |

### 2c. Dynamic Island Regions

| Region | Content |
|--------|---------|
| Compact leading | Status SF Symbol icon |
| Compact trailing | ETA text |
| Minimal | Progress ring with SF Symbol inside |
| Expanded leading | Status icon + label |
| Expanded trailing | ETA text |
| Expanded bottom | Progress bar |

### 2d. Status colours (current)

| Status | Colour | Hex |
|--------|--------|-----|
| `pending` | Yellow | `#EAB308` |
| `preparing` | Orange | `#F97316` |
| `accepted` / `ready` | Blue | `#3B82F6` |
| `out_for_delivery` | Green | `#22C55E` |
| `delivered` | Green | `#22C55E` |
| `cancelled` | Red | — |

---

## 3. Current Issues / Gaps

| # | Issue | Affected |
|---|-------|---------|
| I1 | **No notification icon set** — Android uses the generic white silhouette; no `icon` field in any `app.json` `expo-notifications` config | All 4 apps |
| I2 | **No brand colour consistency** — `mobile-customer` uses `#0ea5e9` (blue), `mobile-business` uses `#0b89a9` (teal), `mobile-driver` uses `#0ea5e9` (blue). No standardised palette | All apps |
| I3 | **Live Activity has no brand identity** — Lock Screen widget shows plain system background with no logo/image; users can't identify the app at a glance | `mobile-customer` |
| I4 | **`PENDING` status copy is confusing** — Lock Screen shows `"Waiting for restaurant to approve order"` but if the restaurant immediately accepts it this text briefly appears for all orders | `mobile-customer` Live Activity |
| I5 | **No `READY` push to customer** — When order status changes to `READY` (restaurant finished, awaiting driver) no push is sent to the customer. Live Activity updates but user gets no banner | `mobile-customer` |
| I6 | **Driver messages have no deep-link** — `data.screen = 'messages'` but driver app doesn't actually handle navigation from notification tap | `mobile-driver` |
| I7 | **Albanian copy is informal/incorrect** — Several Albanian strings use informal register or have typos (`"eshte"` instead of `"është"`, `"befte"` instead of `"bëftë mirë"`) | All apps |
| I8 | **`imageUrl` field is supported by `NotificationService` but never populated** — FCM supports rich images; no notification currently sends a branded logo image | All apps |
| I9 | **Live Activity compact trailing is empty for `pending` status** — `EmptyView()` when pending means the Dynamic Island looks broken | `mobile-customer` Live Activity |

---

## 4. Plan — Notification Icon & App Icon on Push

### How push notification icons work per platform

**Android:**
- The small icon (notification tray icon) is controlled by `icon` in the `expo-notifications` plugin config in `app.json`. Must be a **white transparent PNG** (monochrome), because Android renders it as a silhouette.
- The full-colour large icon can be set at send time via `android.notification.imageUrl` (FCM) — this shows next to the notification in the expanded view.
- Source: Expo docs — `icon` defaults to the app icon if unset; unset = generic white square.

**iOS:**
- iOS always uses the **app icon** as the notification icon. No override is possible from payload.
- The only customisation is the accent colour set at build time. Can also send `imageUrl` in FCM which shows as a thumbnail in the banner.

### 4a. Android — per-app notification icon assets

For each app, create a **monochrome white PNG** of the brand mark (no background):

| App | Asset path | Current `color` in app.json |
|-----|-----------|-----|
| `mobile-customer` | `assets/images/notification-icon.png` | `#0ea5e9` |
| `mobile-driver` | `assets/images/notification-icon.png` | `#0ea5e9` |
| `mobile-business` | `assets/images/notification-icon.png` | `#0b89a9` |
| `mobile-admin` | `assets/images/notification-icon.png` | _(not set — add `#6366f1`)_ |

Then wire each `app.json` plugin config:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/notification-icon.png",
    "color": "#0ea5e9",
    "defaultChannel": "default",
    "enableBackgroundRemoteNotifications": true
  }
]
```

The `icon` must be a **96×96 px white-on-transparent PNG** (Android uses it as `ic_stat_notify`).

### 4b. Rich image (logo thumbnail in banner) — iOS & Android

For notifications that benefit from brand recognition on the banner, set `imageUrl` in the payload to a **hosted square logo URL** (CDN/S3). This requires no native change — just populate the existing `imageUrl` field in `NotificationPayload`.

Recommended: use for the highest-impact notifications — **C2 (On the Way)**, **C3 (Delivered)**, **D1 (New Order Assigned)**, **B1 (New Order for Business)**, **A1/A2 (Admin alerts)**.

```ts
// in orderNotifications.ts — add to payload:
imageUrl: 'https://cdn.deliverygjilan.com/brand/notification-logo.png',
```

The image should be square, minimum 256×256 px. On iOS it appears as a small thumbnail in the notification banner (right side). On Android it appears as a large icon in the expanded notification.

### 4c. Live Activity — brand logo in Lock Screen widget

Currently the Lock Screen widget has no logo. Add the app icon as a small brand mark in the top-left corner of the expanded Lock Screen view.

In `DELIVERY_LIVE_ACTIVITY_WIDGET_SWIFT` (inside `with-live-activity-extension.js`):

```swift
// In the Lock Screen VStack leading line — replace plain business name text with:
HStack(spacing: 6) {
    Image("AppIcon")  // references the app icon asset
        .resizable()
        .frame(width: 20, height: 20)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    Text(context.attributes.businessName)
        .font(.headline)
        .lineLimit(1)
    Spacer()
    // ... ETA text
}
```

**WidgetKit note:** WidgetKit extensions can reference an `Image("AppIcon")` from the extension's asset catalogue if the app icon is added to both the main app target and the widget extension target. Alternatively, add a dedicated `AppLogoSmall` image asset at 20pt.

---

## 5. Plan — Copy Refinements

### 5a. Customer notifications

| ID | Current title | Proposed title | Current body | Proposed body | Notes |
|----|--------------|---------------|-------------|--------------|-------|
| C1 | `Order Accepted! 🎉` | `Order Accepted ✅` | `Your order has been accepted and is being prepared.` | `{businessName} accepted your order and is now preparing it.` | Include business name |
| C2 | `On the Way! 🚗` | `Your Order Is On Its Way 🛵` | `Your order is on its way to you!` | `{driverName} picked up your order and is heading to you.` | Include driver name |
| C3 | `Delivered! ✅` | `Order Delivered! 🎉` | `Your order has been delivered. Enjoy!` | `Your order from {businessName} has been delivered. Enjoy!` | Include business name |
| C4 | `Order Cancelled` | `Order Cancelled` | `Your order has been cancelled.` | `Your order from {businessName} was cancelled.` _(or admin-provided reason)_ | Include business name if available |
| C5 | `Driver is almost there` | `Almost There 📍` | `Your driver is about X minutes away.` | `{driverName} is about {X} min away.` | ✅ already uses etaMinutes parameter |
| C6 | `Driver is waiting outside` | `Driver Waiting Outside` | `Your driver has arrived and is waiting for you.` | `{driverName} has arrived and is waiting for you.` | Use driver name |

### 5b. Driver notifications

| ID | Current title | Proposed title | Current body | Proposed body |
|----|--------------|---------------|-------------|--------------|
| D1 | `New Order Assigned! 🚀` | `New Delivery Assigned` | `New delivery from {address}.` | `Pick up from {businessName} — {address}.` |
| D3 | `New Order Available! 📦` | `Order Available Nearby 📦` | `Order from {businessName} is ready for pickup.` | `{businessName} has an order ready. Tap to claim.` |
| D4 | `Order Still Available 📦` | `Still Available — Claim Now` | `An order is waiting for pickup.` | `An unclaimed order is still waiting. Tap to claim.` |

### 5c. Business notifications

| ID | Current title | Proposed title | Current body | Proposed body |
|----|--------------|---------------|-------------|--------------|
| B1 | `New Order for Your Business` | `New Order Incoming 🛎` | `You have a new incoming order.` | `You have a new order — tap to review and accept.` |

### 5d. Admin notifications

| ID | Current title | Proposed title | Current body | Proposed body |
|----|--------------|---------------|-------------|--------------|
| A1 | `New Order Received` | `New Order` | `A new order was placed. Tap to review it in admin.` | `A new order was just placed. Tap to review.` |
| A2 | `⚠ Order Needs Approval` | `⚠️ Approval Required` | `An order requires your review before it can proceed. Tap to approve.` | `An order needs your approval before it can proceed.` |

### 5e. Albanian copy — corrections needed

The Albanian strings across several notifications use informal/misspelled text. All `.al` locale entries should be reviewed by a native speaker before shipping. Priority items:

| Location | Current Albanian | Issue |
|----------|-----------------|-------|
| C3 body | `"Ju befte mire!"` | should be `"Ju bëftë mirë!"` |
| C1 body | `"po pergatitet"` | should be `"po përgatitet"` |
| C2 body | `"eshte ne rruge"` | should be `"është në rrugë"` |
| D1 title | `"Porosi e re u caktua!"` | should be `"Porosi e re ju është caktuar!"` |
| All general | Missing diacritics (ë, ç, â) throughout | Use correct Albanian Unicode chars |

---

## 6. Plan — Live Activity Content Improvements

### 6a. Fix gap I4 — `PENDING` copy

Current: `"Waiting for restaurant to approve order"` — appears briefly for all orders.

**Proposed:** Show `"Order placed — waiting for confirmation"` with a subtle animated waiting spinner (already using `waitingDots()`). The timer already counts up from placement, which is good.

### 6b. Fix gap I9 — compact trailing when pending

Current: `EmptyView()` in compact trailing for pending — Dynamic Island compact view looks asymmetric.

**Proposed:** Show a short elapsed timer (seconds since placed) or the text `"⏳"` so the compact trailing region is not empty.

```swift
} compactTrailing: {
    if statusKey(context.state.status) == "pending" {
        Text(phaseStartDate(context), style: .timer)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.orange)
            .monospacedDigit()
    } else { ...
```

### 6c. Fix gap I5 — push customer on `READY`

Add `READY` to `customerStatusMessages` in `orderNotifications.ts`:

```ts
READY: (orderId) => ({
    title: 'Order Ready — Driver Picking Up 🧑‍🍳',
    body: 'Your order is ready and waiting for the driver.',
    localeContent: {
        en: { title: 'Order Ready — Driver Picking Up 🧑‍🍳', body: 'Your order is ready and waiting for the driver.' },
        al: { title: 'Porosia është gati — shoferi po vjen', body: 'Porosia juaj është gati dhe po pret shoferin.' },
    },
    data: { orderId, screen: 'orders/active', type: 'ORDER_STATUS' },
    timeSensitive: false,
    relevanceScore: 0.4,
}),
```

### 6d. Add business name & driver name to backend notification functions

Currently `businessName` and `driverName` are not passed to `notifyCustomerOrderStatus` since it only receives `customerId`, `orderId`, `newStatus`. To personalise copy (Section 5a), the function signature needs expanding:

```ts
export function notifyCustomerOrderStatus(
    notificationService: NotificationService,
    customerId: string,
    orderId: string,
    newStatus: string,
    extras?: { businessName?: string; driverName?: string },
): void { ... }
```

Call sites in `OrderService.ts` and `updateOrderStatus` resolver already have access to both values.

---

## 7. Files to Create / Modify

| Path | Action | Notes |
|------|--------|-------|
| `mobile-customer/assets/images/notification-icon.png` | **Create** | 96×96 px white-on-transparent brand mark |
| `mobile-customer/app.json` | **Modify** | Add `"icon": "./assets/images/notification-icon.png"` to `expo-notifications` plugin config |
| `mobile-driver/assets/images/notification-icon.png` | **Create** | Same as above, driver brand mark |
| `mobile-driver/app.json` | **Modify** | Add icon to `expo-notifications` plugin |
| `mobile-business/assets/images/notification-icon.png` | **Create** | Same, business brand mark |
| `mobile-business/app.json` | **Modify** | Add icon and confirm `color: "#0b89a9"` |
| `mobile-admin/assets/images/notification-icon.png` | **Create** | Same, admin brand mark |
| `mobile-admin/app.json` | **Modify** | Add icon + `color: "#6366f1"` to `expo-notifications` plugin |
| `api/src/services/orderNotifications.ts` | **Modify** | (a) Add `extras` param to `notifyCustomerOrderStatus`; (b) Add `READY` status entry; (c) Add `imageUrl` to high-impact notifications; (d) Extend `notifyDriverOrderAssigned` to include `businessName` |
| `mobile-customer/plugins/with-live-activity-extension.js` | **Modify** | (a) Add brand logo `Image` to Lock Screen VStack; (b) Fix compact trailing for `pending` status; (c) Update `pendingMessage()` copy |
| Albanian locale files across all apps | **Modify** | Correct diacritics and register in all `.al` locale entries |

---

## 8. Copy Review Checklist — Ask Before Implementing

Before writing any string to code, ask the user for their preferred wording for **each notification individually**. Use the table below as the prompt script. Do not assume the "Proposed" values in Section 5 are final — they are starting suggestions only.

For each item, ask:
> *"Here is the current text for [ID — trigger description]:"*
> - Title: `…`
> - Body: `…`
> *"What would you like it to say? (or keep as-is)"*

Work through them in this order, one app at a time:

### Customer app — ask in order

- [ ] **C1** — Order accepted (restaurant starts preparing)
- [ ] **C2** — Order out for delivery (driver picked up)
- [ ] **C3** — Order delivered
- [ ] **C4** — Order cancelled
- [ ] **C5** — Driver is almost there (ETA < 3 min)
- [ ] **C6** — Driver arrived and is waiting outside
- [ ] **C-NEW** — Order ready, waiting for driver *(new notification, no current text)*

### Driver app — ask in order

- [ ] **D1** — New order assigned by admin
- [ ] **D2** — Order reassigned away from driver
- [ ] **D3** — New order available in pool (wave 1)
- [ ] **D4** — Order still available (wave 2 expansion)
- [ ] **D5-INFO** — Admin message (INFO level)
- [ ] **D5-WARNING** — Admin message (WARNING level)
- [ ] **D5-URGENT** — Admin message (URGENT level)

### Business app — ask in order

- [ ] **B1** — New order placed for this business
- [ ] **B2-INFO / WARNING / URGENT** — Admin messages (same pattern as D5)

### Admin app — ask in order

- [ ] **A1** — New order placed (admin alert)
- [ ] **A2** — Order needs approval
- [ ] **A3** — Business extended prep time ≥ 10 min *(planned — FF6)*

### Live Activity (Lock Screen / Dynamic Island) — ask for each status label

- [ ] **LA-PENDING** — status label + subtitle text shown while waiting for restaurant
- [ ] **LA-PREPARING** — status label shown while restaurant cooks
- [ ] **LA-READY** — status label shown when food is ready, driver en route to pickup
- [ ] **LA-OFD** — status label shown while driver is heading to customer
- [ ] **LA-DELIVERED** — final status label
- [ ] **LA-CANCELLED** — final status label

### Albanian translations

After English copy is finalised, ask:
> *"Do you want to provide the Albanian translations yourself, or should I translate each string programmatically and then show them to you for review?"*

---

## 9. Delivery Order

1. **Design asset sprint** — produce `notification-icon.png` for each app (requires logo files from designer)
2. **Copy pass** — update all string literals in `orderNotifications.ts` + Albanian corrections in locale files
3. **API extras** — add `extras` param to `notifyCustomerOrderStatus`, add `READY` entry, add `imageUrl`
4. **app.json icon wiring** — add `icon` entry + rebuild each app
5. **Live Activity widget** — brand logo image + pending compact trailing fix (requires macOS iOS rebuild)
6. **EAS Update / EAS Build** — apps using OTA updates (JS-only changes) can use `eas update`; native changes (app.json `icon`, Live Activity widget) require a new `eas build`

> **Note:** Steps 1 and 5 require macOS to generate iOS native code. Steps 2–3 are pure JS/TS and can be deployed via OTA update for existing users.
