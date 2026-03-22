# FF3 — Migrate Navigation SDK to Custom `@rnmapbox/maps` Navigation

<!-- MDS:FF3 | Domain: Future Feature | Updated: 2026-03-22 -->
<!-- Depends-On: M8, A1 -->
<!-- Depended-By: (none yet) -->
<!-- Nav: If navigation.tsx or the unused navigation hooks change, update this file. If @rnmapbox/maps version bumps, verify API compatibility table. -->

> **Status: Not yet implemented — roadmap planning document**

---

## Why Migrate

`@badatgil/expo-mapbox-navigation` wraps the Mapbox Navigation SDK, which carries a credit-based usage cost:

| Mapbox product | Billing model |
|----------------|---------------|
| Maps SDK tile requests | Free tier then $/1000 tile requests |
| Navigation SDK (turn-by-turn) | ~$4–7 per **1000 active navigation sessions** (as of 2026) |
| Directions API (route fetch only) | ~$0.50–1.00 per 1000 requests — already used for route preview |

At scale, a city-wide delivery operation with 20–50 active drivers completing 5–15 deliveries/day each can easily generate thousands of navigation sessions per month. The custom approach eliminates this marginal SDK cost entirely, at the expense of re-routing quality and voice guidance — both of which are either unused or non-critical in this codebase today.

---

## What the Navigation SDK Currently Provides

| Feature | SDK provides | Custom replacement difficulty |
|---------|-------------|-------------------------------|
| Turn-by-turn routing | ✅ | Medium — Mapbox Directions API already used |
| Route rendering on map | ✅ | Easy — `LineLayer` + `ShapeSource` already used in map.tsx |
| Progress events (`distanceRemaining`, `durationRemaining`) | ✅ | Easy — Haversine computation via `routeProgress.ts` already implemented |
| Off-route detection | ✅ | Easy — `useOffRouteDetection` hook already written |
| Re-routing | ✅ | Medium — re-fetch Directions API + re-render (cap at 3 reroutes per delivery) |
| Camera follow (heading-up) | ✅ | Medium — `useNavigationCamera` hook already written |
| Voice guidance | ✅ | **Already disabled — `mute={true}` hardcoded in navigation.tsx** |
| GPS feed to heartbeat | ✅ | ✅ Already bridged via `navigationLocationStore` — no change needed |

> ⚠️ Voice guidance is already muted. The SDK's primary value in this codebase is therefore route progress events and camera management — both of which have custom hook replacements already written and ready to wire.

---

## Existing Unused Hooks (Ready to Wire)

All 8 hooks below live in `mobile-driver/hooks/` and are **fully written but not used**. They were built specifically for a custom navigation view:

| Hook | File | Purpose | Readiness |
|------|------|---------|-----------|
| `useNavigationRoute` | `hooks/useNavigationRoute.ts` | Fetch + cache Mapbox route, reroute policy (cap 3) | ✅ Ready |
| `useNavigationCamera` | `hooks/useNavigationCamera.ts` | Camera follow modes: `free`, `heading-up`, `north-up` | ✅ Ready |
| `useNavigationSteps` | `hooks/useNavigationSteps.ts` | Turn-by-turn step list management | ✅ Ready |
| `useOffRouteDetection` | `hooks/useOffRouteDetection.ts` | Haversine off-route detection | ✅ Ready |
| `useSmoothCameraTracking` | `hooks/useSmoothCameraTracking.ts` | Predicted camera position (interpolation) | ✅ Ready |
| `useNavigationSimulation` | `hooks/useNavigationSimulation.ts` | GPS simulation along a polyline (for testing) | ✅ Ready |
| `usePredictedTracking` | `hooks/usePredictedTracking.ts` | GPS dead-reckoning for smooth marker movement | ✅ Ready |
| `useNavigationState` | `hooks/useNavigationState.ts` | Local state machine (`idle/navigating/arrived`) — overlaps `navigationStore`; resolve before using | ⚠️ Verify |

---

## Existing Components (Ready to Wire)

`mobile-driver/components/navigation/` was also built for the custom view and is currently unused:

| Component | Purpose |
|-----------|---------|
| `InstructionBanner` | Current turn maneuver text (feeds from `useNavigationSteps`) |
| `FloatingMapButtons` | Recenter, camera-mode toggle, mute button |
| `NavigationBottomPanel` | Distance / ETA panel — replaces the current `floatingBar` in navigation.tsx |
| `RecenterButton` | Standalone recenter trigger |

---

## Architecture of the Replacement Screen

The replacement `navigation.tsx` swaps `MapboxNavigationView` for a `@rnmapbox/maps` `MapView` — the same component already used in `map.tsx`. All custom overlays (floating bar, arrival panels, new-order toast, avatar sidebar) stay unchanged.

```
navigation.tsx (new)
├── <MapView style="navigation-night-v1">          ← same Mapbox map, no SDK
│   ├── <Camera ref={...} followUserLocation />    ← driven by useNavigationCamera
│   ├── <ShapeSource id="route" ...>
│   │    └── <LineLayer .../>                      ← route polyline from useNavigationRoute
│   ├── <PointAnnotation id="pickup" .../>
│   └── <PointAnnotation id="dropoff" .../>
│
├── useNavigationRoute()       → fetches route, handles reroute (cap 3)
├── useNavigationCamera()      → manages camera follow / free mode
├── useOffRouteDetection()     → triggers reroute when driver deviates > 50 m
├── useSmoothCameraTracking()  → smooth heading-up follow
├── useNavigationSteps()       → current maneuver text
│
├── <InstructionBanner />      ← components/navigation/ (currently unused)
├── <FloatingMapButtons />     ← components/navigation/ (currently unused)
├── <NavigationBottomPanel />  ← components/navigation/ (currently unused)
├── <RecenterButton />         ← components/navigation/ (currently unused)
│
└── All existing overlays unchanged:
    ├── newOrderToast (zIndex 150)
    ├── avatarSidebar (zIndex 50)
    ├── showPickupPanel (zIndex 200)
    └── showDeliveryPanel (zIndex 200)
```

### Key contract preservation

The replacement must preserve these contracts or the rest of the system breaks:

| Contract | How to preserve |
|----------|----------------|
| `navigationLocationStore.setLocation()` called on every GPS tick | Call it from the `useDriverLocation` GPS watcher or camera location callback |
| `updateProgress(distanceRemaining, durationRemaining, fractionTraveled)` called regularly | Derive from `usePredictedTracking` + `routeProgress.ts` |
| `handleWaypointArrival` / `handleFinalDestinationArrival` trigger arrival panels | Replace with Haversine proximity checks (≤ 30 m threshold) |
| `handleCancelNavigation` calls `clearNavigationLocation()` + `stopNavigation()` | Unchanged — keep as-is |

---

## Step-by-Step Migration Plan

### Phase 0: Pre-work (no user impact)

1. Read [M8 — DRIVER_APP.md](../MOBILE/DRIVER_APP.md) for the current navigation.tsx contracts
2. Audit all 8 unused hooks for TypeScript errors: `cd mobile-driver && npx tsc --noEmit`
3. Audit `components/navigation/` — verify each component compiles and output shapes match hook types
4. Resolve `useNavigationState` overlap with `navigationStore`: either delete the hook, or route `navigationStore` state through it (the latter is not recommended)

### Phase 1: Build `navigation-v2.tsx` (internal testing only)

5. Create `app/navigation-v2.tsx` alongside the original — do not delete `navigation.tsx` yet
6. Replace `MapboxNavigationView` with `MapView` + `Camera`
7. Wire `useNavigationRoute` — confirm the route polyline renders correctly on screen
8. Wire `useOffRouteDetection` + reroute callback to `useNavigationRoute.reroute()`
9. Wire `useNavigationCamera` — test heading-up follow mode during a real drive
10. Connect progress tracking via `usePredictedTracking` + `routeProgress.ts` to call `updateProgress(distanceRemaining, durationRemaining, fractionTraveled)`
11. Ensure `navigationLocationStore.setLocation()` is still called on every GPS tick
12. Implement proximity-based arrival detection (replaces `onWaypointArrival` / `onFinalDestinationArrival`):
    ```ts
    // In the GPS tick / location update callback:
    const distToPickup = haversine(currentLocation, pickupCoords);
    if (distToPickup < 30 && phase === 'to_pickup') setShowPickupPanel(true);

    const distToDropoff = haversine(currentLocation, dropoffCoords);
    if (distToDropoff < 30 && phase === 'to_dropoff') setShowDeliveryPanel(true);
    ```

### Phase 2: QA

13. Test with a real driver device on a real delivery end-to-end
14. Verify watchdog never flags the driver as STALE (heartbeat must fire every 2–5 s)
15. Verify ETA accuracy visible to customers (`durationRemainingS` fed from navigationStore)
16. Verify arrival panels trigger at the right proximity
17. Deliberately drive off-route and confirm re-routing fires (and is capped at 3)
18. Verify the new-order toast still fires when a new order is dispatched mid-navigation

### Phase 3: Cutover

19. Rename `app/navigation.tsx` → `app/navigation-sdk-backup.tsx`
20. Rename `app/navigation-v2.tsx` → `app/navigation.tsx`
21. Remove `@badatgil/expo-mapbox-navigation` from `mobile-driver/package.json`
22. Remove the plugin entry from `mobile-driver/app.json`:
    ```json
    // Remove this from the "plugins" array:
    ["@badatgil/expo-mapbox-navigation", { "accessToken": "..." }]
    ```
23. Run `npm install` in `mobile-driver/` and rebuild native modules: `npx expo prebuild --clean`

### Phase 4: Cleanup (2 weeks after stable production)

24. Delete `app/navigation-sdk-backup.tsx`
25. Delete `@badatgil/expo-mapbox-navigation` from all lock files
26. Update [M8 — DRIVER_APP.md](../MOBILE/DRIVER_APP.md) to reflect the new architecture
27. Update this document status to "Implemented"

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Rerouting quality lower than SDK | Medium | Cap reroutes at 3; Directions API quality is the same underlying engine |
| Arrival detection off by a few metres | Low | 30 m Haversine threshold is generous; tested against real addresses |
| Heartbeat location feed breaks | Low | `navigationLocationStore` contract unchanged; just call `setNavigationLocation()` from GPS tick |
| ETA inaccuracy reported to customer | Medium | `routeProgress.ts` already implements Haversine ETA — it's the fallback used today anyway |
| More Directions API calls from rerouting | Low | Each reroute = 1 call; cap at 3 per delivery; within free tier for 50 drivers |
| Native rebuild required | Certain | Removing the SDK requires `expo prebuild --clean`; plan for a full app rebuild/submission |

---

## Dependency Removal

After cutover, remove from `mobile-driver/`:

```jsonc
// package.json — remove:
"@badatgil/expo-mapbox-navigation": "..."

// app.json plugins array — remove:
["@badatgil/expo-mapbox-navigation", { "accessToken": "..." }]
```

`EXPO_PUBLIC_MAPBOX_TOKEN` is **still required** for `@rnmapbox/maps` tile rendering and the Directions API.

---

## Pre-Implementation Checklist

Before starting Phase 1, re-read:

| Doc | Why |
|-----|-----|
| [M8 — DRIVER_APP.md](../MOBILE/DRIVER_APP.md) | Current navigation.tsx contracts, heartbeat integration, unused hooks inventory |
| [A1 — ARCHITECTURE.md](../ARCHITECTURE.md) | Overall realtime model — ensure subscriber contracts are unchanged |
| [B4 — WATCHDOG_HEARTBEAT.md](../BACKEND/WATCHDOG_HEARTBEAT.md) | Heartbeat timing requirements — custom nav must still satisfy them |
| [MDS_INDEX.md](../MDS_INDEX.md) | Check for any new docs added since this file was last updated |
