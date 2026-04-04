# Demo Mode — Auto-Progression for Apple Review

## Status

### Implemented in code

- `users.isDemoAccount` added to the DB schema
- SQL migration added: `api/database/migrations/0002_add-is-demo-account-to-users.sql`
- `DemoProgressionService` added and wired into `OrderService.createOrderWithSideEffects`
- API GraphQL user and business-owner inputs expose `isDemoAccount`
- Admin panel can mark customer, driver, and business-owner accounts as demo/review accounts during creation
- Admin panel can update the demo/review flag for existing customer and driver accounts
- Demo customer orders now auto-progress on timers:
  - `AWAITING_APPROVAL` → `PENDING` after 3s when needed
  - `PENDING` → `PREPARING` after 8s
  - `PREPARING` → `READY` after 20s
  - `READY/PREPARING` → `OUT_FOR_DELIVERY` after 30s
  - `OUT_FOR_DELIVERY` → `DELIVERED` after 60s
- Existing `approveOrder` and `startPreparing` side effects now run through shared `OrderService` helpers

### Still required from setup

- Run the new DB migration
- Mark the Apple review customer account with `isDemoAccount = true` from the admin panel or DB
- Create or choose a demo driver account and set `DEMO_DRIVER_ID`
- Make sure the demo driver is a real `DRIVER` user and can receive orders in the target zone
- Keep a demo business with products and valid opening hours available for the review flow

## Problem

Zipp is a three-sided marketplace (Customer ↔ Business ↔ Driver).
Apple review testers test each app in isolation. Without intervention:
- A Customer order sits on `PENDING` forever (no business to accept it)
- The Driver app never receives an order (no customer to place one)
- The Business app shows an empty orders screen

## Solution

When a **demo account** places an order, the backend automatically advances it through
the full order lifecycle on a timer — simulating a real business accepting and a real
driver picking up and delivering.

No separate worker process needed. Node's built-in `setTimeout` chains run inside
the existing Express/GraphQL server process (it's a long-running process, not serverless).

---

## Architecture

### 1. Demo account flag — `users.isDemoAccount`

Add a boolean column `is_demo_account` (default `false`) to the `users` table.
Set it to `true` for the Apple review test accounts via the admin panel or a direct DB update.

This is cleaner than a hardcoded phone number list and doesn't require a redeploy
to add/remove demo accounts.

### 2. Progression schedule

Once a demo order is placed and reaches `PENDING`, the following fires:

| Delay | Action | Status after |
|-------|--------|--------------|
| 0 s | Order created | `PENDING` |
| 8 s | Business accepts (`startPreparing`) | `PREPARING` |
| 20 s | Business marks ready | `READY` |
| 30 s | Driver assigned + picks up | `OUT_FOR_DELIVERY` |
| 60 s | Delivered | `DELIVERED` |

Timings are conservative enough to let the reviewer see each state on screen.

### 3. Demo driver (optional but recommended)

If a `DRIVER` user tagged `isDemoAccount = true` exists (or `DEMO_DRIVER_ID` is set),
the progression impersonates that driver at the `OUT_FOR_DELIVERY` step, assigning
them to the order so the Customer app can show a driver name and render the driver
pin on the map.

If no demo driver is configured, the progression falls back to SUPER_ADMIN context
for those two steps — the order still reaches `DELIVERED` correctly, but the
Customer app map screen will show the delivery route with no driver dot.
This is safe for Apple review; include a one-line explanation in the App Review Notes
(see template below).

### 4. AWAITING_APPROVAL bypass

The platform holds orders in `AWAITING_APPROVAL` as a fraud / troll-prevention gate
when any of the following are true:

- **First-ever order** from this customer account
- **High value** order (total > €20)
- **Out-of-zone** drop-off: the selected address or the user’s actual GPS location is
  outside configured service zones. This catches users who deliberately override
  their address to an in-zone location while physically sitting outside the zone.

An admin must manually approve before the business or driver sees it.

For the demo progression, `maybeApproveOrder` fires after 3 s if the order is still
in `AWAITING_APPROVAL`, then the normal chain continues from `PENDING`.
The reviewer never has to do anything — it auto-approves.

The App Review Notes template below explicitly names this hold and explains it is
intentional fraud protection, not a bug.

---

## Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `api/src/services/DemoProgressionService.ts` | Core timer chain — schedules all state transitions |
| `api/database/migrations/0002_add-is-demo-account-to-users.sql` | SQL migration adding the column |

### Modified files

| File | Change |
|------|--------|
| `api/src/database/schema/users.ts` | Add `isDemoAccount boolean default false` |
| `api/src/services/OrderService.ts` | After `createOrderWithSideEffects` completes, check `isDemoAccount` and fire `DemoProgressionService.scheduleProgression(order, context)` |
| `api/src/models/Order/resolvers/Mutation/approveOrder.ts` | Delegate to shared `OrderService.approveOrderWithSideEffects` |
| `api/src/models/Order/resolvers/Mutation/startPreparing.ts` | Delegate to shared `OrderService.startPreparingWithSideEffects` |
| `api/src/services/AuditLogger.ts` | Map `BUSINESS_OWNER` / `BUSINESS_EMPLOYEE` to `BUSINESS` actor type |

### Admin operations

The admin panel is the operational entry point for review/demo accounts:

- Customers: create/edit in `admin-panel/src/app/dashboard/users/page.tsx`
- Drivers: create/edit in `admin-panel/src/app/dashboard/drivers/page.tsx`
- Business owners: set during business creation in `admin-panel/src/app/dashboard/businesses/page.tsx`

The UI labels these as `Demo / App Review` accounts so they remain easy to identify later.

---

## Implementation Detail

### `DemoProgressionService.ts`

```ts
// Pseudocode — actual implementation to follow
export class DemoProgressionService {
  constructor(
    private orderService: OrderService,
    private demoDriverId: string  // read from env DEMO_DRIVER_ID
  ) {}

  scheduleProgression(order: Order, context: AppContext) {
    const orderId = order.id;

    const advance = async (delayMs: number, fn: () => Promise<void>) => {
      await sleep(delayMs);
      try { await fn(); } catch (e) { /* log, don't crash */ }
    };

    // If order starts at AWAITING_APPROVAL, approve it first then continue
    const startFromPending = async () => {
      advance(8_000,  () => this.markPreparing(orderId, context));
      advance(20_000, () => this.markReady(orderId, context));
      advance(30_000, () => this.assignDriverAndPickUp(orderId, context));
      advance(60_000, () => this.markDelivered(orderId, context));
    };

    if (order.status === 'AWAITING_APPROVAL') {
      advance(3_000, () => this.approve(orderId, context))
        .then(startFromPending);
    } else {
      startFromPending();
    }
  }

  private async markPreparing(orderId, ctx) {
    await ctx.orderService.updateStatusWithSideEffects(orderId, 'PREPARING', ctx);
  }
  private async markReady(orderId, ctx) {
    await ctx.orderService.updateStatusWithSideEffects(orderId, 'READY', ctx);
  }
  private async assignDriverAndPickUp(orderId, ctx) {
    // Use updateStatusAndDriver from OrderRepository to atomically assign demo driver
    await ctx.orderService.updateStatusWithSideEffects(orderId, 'OUT_FOR_DELIVERY', {
      ...ctx,
      userData: { ...ctx.userData, userId: this.demoDriverId, role: 'DRIVER' },
    });
  }
  private async markDelivered(orderId, ctx) {
    await ctx.orderService.updateStatusWithSideEffects(orderId, 'DELIVERED', ctx);
  }
  private async approve(orderId, ctx) {
    // Call approveOrder logic directly (skip resolver layer)
    await ctx.orderService.updateStatusWithSideEffects(orderId, 'PENDING', ctx, { skipValidation: true });
  }
}
```

### Environment variable

Add to `api/.env` and all `eas.json` env blocks:
```
DEMO_DRIVER_ID=<uuid of the demo driver user>
```

---

## What the Apple Reviewer Will See

### Customer (Zipp Go)
1. Opens app, logs in with demo credentials
2. Places an order
3. Status changes to "Preparing" (~8s), "Ready" (~20s), "Out for delivery" (~30s)
4. Live Activity / Dynamic Island shows driver name + ETA updating
5. Order marked "Delivered" (~60s)
6. Order appears in history

### Business (Zipp Business)
1. Opens app, logs in with demo business credentials
2. A pre-loaded product catalog and store profile is visible
3. An incoming order arrives (either from the demo customer placing one, or
   a test order can be pre-placed before review — see below)
4. Order management flow is fully testable

> **Note:** The auto-progression fires server-side, so the Business app will show
> the order briefly arriving then immediately jumping through states. To let the
> reviewer interact with it naturally, consider a longer delay (30s) before
> the first auto-transition, with a note in the review notes explaining:
> *"Orders auto-progress after 30 seconds if not manually accepted, to assist review."*

### Driver (Zipp Driver)
1. Opens app, logs in with demo driver credentials
2. Goes online
3. An order in `READY` state appears (assigned to their account by the progression)
4. They can view map, mark as picked up, mark as delivered

> **Note:** For the Driver app specifically, the demo driver is *assigned* the order
> automatically. The reviewer doesn't need to accept it — it just appears.
> Include this in the App Review Notes.

---

## App Review Notes — Updated Text

Add this to the **Notes for Reviewer** in ASC for each app:

### Zipp Go (Customer)
```
This is a multi-sided marketplace. To simplify review, the demo account
has automatic order progression enabled.

1. Log in with the demo credentials below
2. Browse to any business and place any order
3. The first order will briefly pause on "Awaiting Approval" (1–3 seconds).
   This is intentional fraud/troll prevention: the platform holds first-time
   orders and orders placed from outside the service zone for admin review
   before a business or driver sees them. The demo account auto-approves after 3s.
4. The order then automatically progresses through all states
   (Preparing → Ready → Out for Delivery → Delivered) over ~60 seconds
5. Live Activity / Dynamic Island will update in real time during delivery

Note: The map during delivery shows the route but no moving driver dot —
the demo driver is stationary (not running the Driver app). In production,
the driver app transmits live GPS and the dot moves in real time.

Demo credentials: [phone number] / OTP: [code or bypass]
Contact: support@zippdelivery.com
```

### Zipp Business
```
Demo credentials log into a pre-configured test business with products ready.
An automated test customer order will arrive within ~10 seconds of logging in
(or you can trigger one by using the Customer app with its demo credentials).

The order management flow (Accept → Preparing → Ready) is fully functional.

Demo credentials: [phone number] / OTP: [code or bypass]
Contact: support@zippdelivery.com
```

### Zipp Driver
```
Background location is used exclusively to share the driver's position
with customers during active deliveries. Location is not collected when offline.

The demo driver account will automatically receive an assigned delivery order
within ~30 seconds of going online. No separate customer action is needed.

Demo credentials: [phone number] / OTP: [code or bypass]
Contact: support@zippdelivery.com
```

---

## Pre-review DB Setup Checklist

- [ ] Create demo customer account → set `isDemoAccount = true`
- [ ] (Optional) Create demo driver account → set `isDemoAccount = true`, set `DEMO_DRIVER_ID` env var — without this the order still completes but no driver pin appears on the Customer map
- [ ] Create demo business account + business profile with products and open hours
- [ ] Set demo business `ownerId` to the demo business user
- [ ] If demo driver created: verify they are in a delivery zone that covers the demo customer's address
- [ ] Test full progression end-to-end on staging before submission

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Timer fires after server restart | Acceptable — review sessions are short-lived. Could persist pending progressions to DB if needed later. |
| Demo order spams real business/driver push notifications | Demo accounts should be assigned to a demo business only; demo driver is separate from real drivers |
| Context object goes stale mid-progression | Pass orderId only, re-fetch fresh context in each step rather than closing over the original context |
| Reviewer manually cancels order mid-flow | Each step catches errors and stops silently — no crash |
