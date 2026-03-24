# Driver App UX Improvements Plan

> Three self-contained improvements, ordered by implementation effort (smallest first).

---

## 1. Active Orders Badge on Map Tab Icon

**What:** Show a numeric badge on the Map tab when the driver has assigned orders pending.  
**Why:** Drivers switching to other tabs (Home, Earnings) get an instant visual cue to return.  
**Effort:** ~5 minutes, 1 file.

### Changes

**`mobile-driver/app/(tabs)/_layout.tsx`**

The `_layout.tsx` already imports nothing from the store. Add `useAuthStore` (or a lightweight order count selector) and pass `tabBarBadge` to the Map screen.

```diff
+ import { useOrderStore } from '@/store/orderStore'; // or derive from Apollo cache

  <Tabs.Screen
      name="map"
      options={{
          title: t.tabs.map,
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
+         tabBarBadge: assignedOrderCount > 0 ? assignedOrderCount : undefined,
+         tabBarBadgeStyle: { backgroundColor: '#8B5CF6', fontSize: 10 },
      }}
  />
```

**Where to get the count:**  
The `map.tsx` screen already runs the `GET_DRIVER_ORDERS` query. The simplest path is to lift the assigned count into a small Zustand slice or a React Context so `_layout.tsx` can read it without re-running the query.  
Alternative (zero new state): pass it via `expo-router` search params — but Zustand is cleaner.

---

## 2. Speed Pill on Map During Active Navigation

**What:** A small floating pill showing current speed in km/h, visible only while the driver has an active order.  
**Why:** Standard in every delivery/nav app. `location.speed` is already captured by `useDriverLocation` — it just isn't rendered anywhere.

**Effort:** ~15 minutes, 1 file.

### Changes

**`mobile-driver/app/(tabs)/map.tsx`**

`location.speed` comes from `expo-location` in m/s. Convert to km/h for display.

Add the pill to the JSX (just below the pool pill, top-right area):

```tsx
{/* ═══ Speed pill — active navigation only ═══ */}
{hasActiveNavigation && location?.speed != null && location.speed > 0.5 && (
    <View style={[styles.speedPill, { top: insets.top + 12, right: 14 }]}>
        <Text style={styles.speedValue}>
            {Math.round(location.speed * 3.6)}
        </Text>
        <Text style={styles.speedUnit}>km/h</Text>
    </View>
)}
```

Add styles:

```ts
speedPill: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,12,24,0.88)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 20,
    minWidth: 52,
},
speedValue: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
},
speedUnit: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -2,
},
```

**Note:** `location.speed` will be `null` when the device can't determine speed (stationary, GPS just acquired). The `> 0.5` guard hides it below walking speed so it doesn't flicker to 0 at stops.

---

## 3. Heading + Speed in Heartbeat Payload

**What:** Include `heading` (degrees 0–360) and `speed` (m/s) in the heartbeat mutation sent every 2–5 seconds.  
**Why:** The admin panel dead-reckons driver position between heartbeats using the last heading + speed. Currently it can only estimate forward movement — it has no idea which direction the driver is facing, so the extrapolated position drifts off-road.

**Effort:** ~30–45 minutes, touches 5 files across API and app.

### Files to change

#### A. GraphQL schema — `api/src/models/Driver/Driver.graphql`

```diff
  driverHeartbeat(
      latitude: Float!
      longitude: Float!
      activeOrderId: ID
      navigationPhase: String
      remainingEtaSeconds: Int
+     heading: Float      # 0–360 degrees, null if unavailable
+     speed: Float        # m/s, null if unavailable
  ): DriverHeartbeatResult!
```

Also add to `adminSimulateDriverHeartbeat` for parity.

After editing, run `npm run codegen` in `api/` to regenerate `src/generated/`.

#### B. Backend handler — `api/src/services/DriverHeartbeatHandler.ts`

`processHeartbeat` currently takes `(userId, latitude, longitude, etaPayload?)`. Add the new fields:

```diff
  async processHeartbeat(
      userId: string,
      latitude: number,
      longitude: number,
+     heading?: number | null,
+     speed?: number | null,
      etaPayload?: HeartbeatEtaPayload
  ) {
```

Pass them into the `driverRepository.processHeartbeat(...)` call and include in the `publishDriverUpdate` payload so the admin map receives heading + speed in the subscription event.

#### C. DB schema — `api/database/schema.ts` + new migration

The `drivers` table currently has `driver_lat` and `driver_lng` but no heading/speed columns. Add:

```ts
driverHeading: doublePrecision('driver_heading'),
driverSpeed:   doublePrecision('driver_speed'),
```

Generate migration: `npm run db:generate` in `api/`.

#### D. Resolver — wherever `driverHeartbeat` resolver is defined

Pass the new args down to `driverService.processHeartbeat(...)`:

```diff
  async driverHeartbeat(
      _: unknown,
-     { latitude, longitude, activeOrderId, navigationPhase, remainingEtaSeconds },
+     { latitude, longitude, activeOrderId, navigationPhase, remainingEtaSeconds, heading, speed },
      ctx
  ) {
-     return ctx.driverService.processHeartbeat(userId, latitude, longitude, { ... });
+     return ctx.driverService.processHeartbeat(userId, latitude, longitude, heading, speed, { ... });
  }
```

#### E. Mobile app — `mobile-driver/hooks/useDriverHeartbeat.ts`

Two mutations need updating: `DRIVER_HEARTBEAT_MUTATION` (Apollo, line 28) and `DRIVER_HEARTBEAT_MUTATION_TEXT` (raw fetch for background, line 53).

```diff
  mutation DriverHeartbeat(
      $latitude: Float!
      $longitude: Float!
      $activeOrderId: ID
      $navigationPhase: String
      $remainingEtaSeconds: Int
+     $heading: Float
+     $speed: Float
  ) {
      driverHeartbeat(
          latitude: $latitude
          longitude: $longitude
          activeOrderId: $activeOrderId
          navigationPhase: $navigationPhase
          remainingEtaSeconds: $remainingEtaSeconds
+         heading: $heading
+         speed: $speed
      ) { ... }
  }
```

Then in `sendHeartbeat({ variables: { ... } })` at line ~391:

```diff
  variables: {
      latitude: location.latitude,
      longitude: location.longitude,
+     heading: location.heading ?? undefined,
+     speed: location.speed ?? undefined,
      ...getNavigationEtaPayload(),
  }
```

`location.heading` and `location.speed` are already present on the `DriverLocation` type returned by `useDriverLocation` — no hook changes needed.

#### F. Admin panel (optional, separate task)

The `driversUpdated` subscription payload would now carry `heading` and `speed`. The admin map's dead-reckoning loop can be updated to use actual heading instead of inferring direction from successive lat/lng deltas.

---

## Summary

| # | Change | Files | Risk |
|---|--------|-------|------|
| 1 | Map tab badge | `_layout.tsx` + tiny store slice | Low |
| 2 | Speed pill | `map.tsx` | Low |
| 3 | Heading + speed in heartbeat | schema, handler, DB, resolver, hook | Medium (requires migration + API deploy) |

Do 1 and 2 in a single OTA push. Do 3 after deploying the API change.
