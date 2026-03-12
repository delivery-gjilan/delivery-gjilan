# Driver Heartbeat System Analysis & Fixes

## Overview

The driver heartbeat system keeps the backend informed that a driver is actively connected. However, there are several critical issues causing drivers to show as **STALE** even when the app is actively open.

---

## Current Implementation

### Mobile App (`mobile-driver`)

**Location**: `hooks/useDriverHeartbeat.ts`

**How it works**:
1. Hook starts when driver is authenticated
2. Sends GraphQL mutation `driverHeartbeat` every **5 seconds**
3. Includes GPS location with each heartbeat
4. Uses `setInterval` for foreground heartbeats
5. Uses `expo-location` background task for background heartbeats

**Integration**:
- Called from `useDriverTracking()` hook
- Initialized in `app/_layout.tsx` (app-level)
- Runs continuously while authenticated

### Backend Watchdog

**Location**: `api/src/services/DriverWatchdogService.ts`

**Thresholds**:
- **CONNECTED → STALE**: No heartbeat for **45 seconds**
- **STALE → LOST**: No heartbeat for **90 seconds**
- Watchdog checks every **10 seconds**
- Per-driver timers schedule transitions in real-time

**How it works**:
1. `trackHeartbeat(userId)` schedules timers when heartbeat received
2. If no heartbeat arrives within 45s, driver marked STALE
3. Periodic 10s check acts as fallback reconciliation
4. Publishes state changes via GraphQL subscriptions

---

## Critical Issues Found

### 🚨 Issue #1: setInterval Unreliability on iOS (MOST LIKELY CAUSE)

**Problem**: 
- iOS suspends JavaScript timers when app enters background or inactive state
- `setInterval` may not fire reliably even when app is in foreground but inactive
- Example: User opens notification center, switches tabs briefly, receives phone call

**Code location**: Lines 401-403
```typescript
heartbeatIntervalRef.current = setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
```

**Impact**:
- Heartbeat can stop sending for 10-30+ seconds
- Driver marked STALE after 45s
- Background task should take over, but may not be running

**Evidence**:
- App state transition handler only checks `match(/inactive|background/)` → `active`
- No handling for brief inactive periods
- Background task requires background permission (may not be granted)

---

### 🚨 Issue #2: GPS Timeout Causes Skipped Heartbeats

**Problem**: 
- If GPS takes longer than **2 seconds** to acquire, heartbeat is **skipped entirely**
- No fallback to last known location
- Next attempt is 5s away

**Code location**: Lines 264-285
```typescript
// Try real GPS with aggressive timeout (2 seconds max)
try {
  const location = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('GPS timeout')), 2000)),
  ]) as any;
  
  if (location) {
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  }
} catch (err) {
  console.warn('[Heartbeat] GPS failed or timed out, using simulation');
}

// GPS unavailable – skip this heartbeat
console.warn('[Heartbeat] GPS unavailable, skipping heartbeat');
return null; // ❌ SKIPS HEARTBEAT
```

**Impact**:
- Multiple consecutive GPS timeouts = multiple skipped heartbeats
- 9 skipped heartbeats in 45s window → STALE status
- Common in poor GPS conditions (indoors, urban canyons, tunnels)

---

### 🚨 Issue #3: No Network Retry Logic

**Problem**: 
- Network errors are logged but not retried
- Next heartbeat attempt is 5s away
- Silent failures accumulate

**Code location**: Lines 360-370
```typescript
catch (err: any) {
  console.error('[Heartbeat] Error:', err.message);
  // Network error - mark as potentially stale
  setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
}
```

**Impact**:
- Brief network interruptions (switching WiFi/cellular, tunnels) cause missed heartbeats
- No immediate retry on failure
- No exponential backoff or retry queue

---

### 🚨 Issue #4: Background Permission Required but Optional

**Problem**: 
- Background heartbeat requires "Always" location permission
- If user denies, only foreground heartbeat runs
- Foreground `setInterval` unreliable (see Issue #1)

**Code location**: Lines 230-245
```typescript
const bgResult = await Location.requestBackgroundPermissionsAsync();
if (bgResult.status !== 'granted') {
  console.warn('[Heartbeat] Background location permission denied');
  Alert.alert(
    'Background Location Needed',
    'To keep tracking your position during deliveries, set location access to "Always" in Settings.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Not Now', style: 'cancel' },
    ]
  );
  // Continue without background tracking – foreground-only mode ⚠️
}
```

**Impact**:
- Many users dismiss background permission prompt
- App continues without background heartbeat
- Relies entirely on unreliable foreground `setInterval`

---

### 🚨 Issue #5: Background Task Token Expiry Handling

**Problem**: 
- Background task checks JWT expiry and skips heartbeat if expired
- **Does not attempt to refresh token**
- No notification to foreground app

**Code location**: Lines 81-91
```typescript
const payload = JSON.parse(atob(payloadB64)) as { exp?: number };
if (payload.exp && Date.now() / 1000 > payload.exp) {
  console.warn('[Heartbeat][Background] JWT expired – skipping heartbeat until foreground refresh');
  return; // ❌ SKIPS HEARTBEAT, NO REFRESH ATTEMPT
}
```

**Impact**:
- If app backgrounded for extended period, JWT expires
- All background heartbeats skipped until app foregrounded
- Driver marked STALE/LOST even though location task is running

---

### ⚠️ Issue #6: Location Watch May Not Seed Immediately

**Problem**: 
- First heartbeat may fail if location watch hasn't populated `lastLocationRef.current`
- Fallback to last known position (max 60s old) may not exist

**Code location**: Lines 298-334
```typescript
const startLocationWatch = useCallback(async () => {
  // ... starts watch
  if (!lastLocationRef.current) {
    // Try to seed from last known - may not exist
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
  }
}, []);
```

**Impact**:
- First few heartbeats after app start may fail
- Cold start with no cached location → skipped heartbeats

---

## Recommended Fixes

### Priority 1: Fix setInterval Unreliability

**Solution**: Use a more reliable background execution strategy

```typescript
// Option A: Use react-native-background-timer
import BackgroundTimer from 'react-native-background-timer';

// Replace setInterval with BackgroundTimer.setInterval
heartbeatIntervalRef.current = BackgroundTimer.setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);

// Option B: Use expo-background-fetch + expo-task-manager
// Schedule heartbeat as periodic background task (iOS: 15min minimum, Android: more flexible)

// Option C: Combine both - use BackgroundTimer for foreground + expo-location for background
```

**Implementation**:
1. Add `react-native-background-timer` dependency
2. Replace `setInterval` with `BackgroundTimer.setInterval`
3. Clear using `BackgroundTimer.clearInterval`
4. **Benefits**: Continues running even when app is backgrounded/inactive

---

### Priority 2: Never Skip Heartbeats on GPS Timeout

**Solution**: Always send heartbeat with best available location

```typescript
const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number }> => {
  // Priority 1: Navigation SDK location
  const navLocationState = useNavigationLocationStore.getState();
  if (navLocationState.isFresh() && navLocationState.location) {
    return navLocationState.location;
  }

  // Priority 2: Last known location from watch
  if (lastLocationRef.current) {
    console.log('[Heartbeat] Using cached location from watch');
    return lastLocationRef.current;
  }

  // Priority 3: Try real GPS with timeout
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GPS timeout')), 2000)),
    ]) as any;
    
    if (location) {
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      lastLocationRef.current = coords;
      return coords;
    }
  } catch (err) {
    console.warn('[Heartbeat] GPS timeout, checking fallbacks');
  }

  // Priority 4: Last known position from system (up to 5 min old)
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000 });
    if (lastKnown) {
      const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
      lastLocationRef.current = coords;
      return coords;
    }
  } catch {
    // Ignore
  }

  // Priority 5: Use last successful location even if stale
  if (lastLocationRef.current) {
    console.warn('[Heartbeat] Using stale cached location');
    return lastLocationRef.current;
  }

  // Priority 6: Hardcoded fallback (city center) - LAST RESORT
  // Better to send heartbeat with approximate location than no heartbeat at all
  console.error('[Heartbeat] No location available, using fallback coordinates');
  return { latitude: 42.6629, longitude: 20.2936 }; // Gjilan city center
}, []);

// Update doHeartbeat to ALWAYS send
const doHeartbeat = useCallback(async () => {
  try {
    const location = await getCurrentLocation(); // Now always returns a location

    lastLocationRef.current = location;

    const result = await sendHeartbeat({
      variables: {
        latitude: location.latitude,
        longitude: location.longitude,
        ...getNavigationEtaPayload(),
      },
    });

    const data = (result.data as any)?.driverHeartbeat;
    if (data?.success) {
      setConnectionStatus(data.connectionStatus as ConnectionStatus);
      console.log('[Heartbeat] Sent', {
        status: data.connectionStatus,
        locationUpdated: data.locationUpdated,
      });
    } else {
      console.warn('[Heartbeat] Failed:', result.error);
    }
  } catch (err: any) {
    console.error('[Heartbeat] Error:', err.message);
    // Still mark potentially stale on network error, but we tried our best
    setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
  }
}, [getCurrentLocation, getNavigationEtaPayload, sendHeartbeat]);
```

**Key changes**:
- ✅ Always returns a location (never null)
- ✅ Fallback chain: Nav SDK → Cached → Fresh GPS → Last known (5min) → Stale cache → Hardcoded
- ✅ Heartbeat ALWAYS sent, never skipped due to GPS
- ✅ Backend can detect stale location if needed (timestamp on backend)

---

### Priority 3: Add Network Retry Logic

**Solution**: Retry failed heartbeats with exponential backoff

```typescript
const doHeartbeat = useCallback(async (isRetry = false) => {
  try {
    const location = await getCurrentLocation();
    lastLocationRef.current = location;

    const result = await sendHeartbeat({
      variables: {
        latitude: location.latitude,
        longitude: location.longitude,
        ...getNavigationEtaPayload(),
      },
    });

    const data = (result.data as any)?.driverHeartbeat;
    if (data?.success) {
      setConnectionStatus(data.connectionStatus as ConnectionStatus);
      console.log('[Heartbeat] Sent', {
        status: data.connectionStatus,
        locationUpdated: data.locationUpdated,
        isRetry,
      });
    } else {
      console.warn('[Heartbeat] Failed:', result.error);
    }
  } catch (err: any) {
    console.error('[Heartbeat] Error:', err.message);
    
    // Retry once after 1 second if this wasn't already a retry
    if (!isRetry) {
      console.log('[Heartbeat] Retrying in 1s...');
      setTimeout(() => doHeartbeat(true), 1000);
    }
    
    setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
  }
}, [getCurrentLocation, getNavigationEtaPayload, sendHeartbeat]);
```

**Benefits**:
- Brief network glitches don't cause STALE status
- One retry attempt per failure
- Doesn't spam backend with retries

---

### Priority 4: Make Background Permission Mandatory for Drivers

**Solution**: Block driver from going online without background permission

```typescript
const requestPermissions = useCallback(async (): Promise<boolean> => {
  // ... existing foreground permission check

  // ⚠️ MANDATORY for drivers (not optional!)
  const bgResult = await Location.requestBackgroundPermissionsAsync();
  if (bgResult.status !== 'granted') {
    console.warn('[Heartbeat] Background location permission REQUIRED');
    Alert.alert(
      'Background Location Required',
      'Delivery drivers must enable "Always" location access to receive orders. This ensures we can track your position during deliveries.',
      [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            // Log the user out or prevent online status
            console.log('[Heartbeat] Driver refused background permission, cannot continue');
          }
        },
      ]
    );
    return false; // ❌ BLOCK INSTEAD OF CONTINUING
  }

  return true;
}, []);
```

**Benefits**:
- Ensures background heartbeat always works
- Prevents partial functionality that confuses drivers
- Clear UX: either full tracking or no service

---

### Priority 5: Refresh Token in Background Task

**Solution**: Implement token refresh in background heartbeat

```typescript
async function sendBackgroundHeartbeat(latitude: number, longitude: number): Promise<void> {
  try {
    let token = await getToken();
    const endpoint = process.env.EXPO_PUBLIC_API_URL;

    if (!token || !endpoint) {
      return;
    }

    // Check token expiry
    try {
      const payloadB64 = token.split('.')[1];
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64)) as { exp?: number };
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          console.warn('[Heartbeat][Background] JWT expired, attempting refresh...');
          
          // TODO: Call refresh token mutation
          // For now, skip - foreground will refresh when app activates
          return;
        }
      }
    } catch {
      return;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: DRIVER_HEARTBEAT_MUTATION_TEXT,
        variables: { latitude, longitude },
      }),
    });

    if (response.status === 401) {
      console.warn('[Heartbeat][Background] 401 Unauthorized - token may be invalid');
      // TODO: Clear token, force re-login on foreground
    }

    if (!response.ok) {
      console.warn('[Heartbeat][Background] Request failed with status', response.status);
    }
  } catch (error) {
    console.warn('[Heartbeat][Background] Failed:', error);
  }
}
```

---

## Testing Plan

### Test Case 1: App in Foreground
**Expected**: Heartbeat every 5s, driver stays CONNECTED
**Current**: ✅ Works (when GPS is fast)
**After fix**: ✅ Works reliably even with slow GPS

### Test Case 2: App Backgrounded (with "Always" permission)
**Expected**: Background task sends heartbeat every 5s, driver stays CONNECTED
**Current**: ❌ May fail due to GPS timeout or token expiry
**After fix**: ✅ Works reliably

### Test Case 3: App Inactive (notification center, call, etc.)
**Expected**: Heartbeat continues, driver stays CONNECTED
**Current**: ❌ setInterval may pause, driver goes STALE
**After fix**: ✅ BackgroundTimer continues execution

### Test Case 4: Poor GPS Signal
**Expected**: Heartbeat sent with cached/fallback location
**Current**: ❌ Heartbeat skipped, driver goes STALE after 9 skips
**After fix**: ✅ Heartbeat always sent with best available location

### Test Case 5: Brief Network Interruption
**Expected**: Retry mechanism recovers, driver stays CONNECTED
**Current**: ❌ Heartbeats skipped during outage, may go STALE
**After fix**: ✅ Retry once after 1s

### Test Case 6: Background Permission Denied
**Expected**: Clear error, cannot go online
**Current**: ⚠️ App continues with unreliable foreground-only heartbeat
**After fix**: ✅ Driver blocked from going online, directed to settings

---

## Implementation Priority

1. **Immediate (Critical)**: 
   - Fix #2: Never skip heartbeats on GPS timeout
   - Fix #3: Add network retry logic
   
2. **High Priority**:
   - Fix #1: Replace setInterval with BackgroundTimer
   - Fix #4: Make background permission mandatory

3. **Medium Priority**:
   - Fix #5: Token refresh in background task
   - Fix #6: Improve location watch seeding

4. **Monitoring**:
   - Add Sentry/analytics events for:
     - GPS timeout frequency
     - Network error frequency
     - Background task execution
     - Heartbeat skip count per driver

---

## Monitoring & Debugging

### Add Logging
```typescript
// Track heartbeat health
let consecutiveFailures = 0;
let consecutiveGpsTimeouts = 0;

const doHeartbeat = useCallback(async () => {
  try {
    const location = await getCurrentLocation();
    
    if (location === lastLocationRef.current) {
      consecutiveGpsTimeouts++;
      console.warn('[Heartbeat] Using stale location', { consecutiveGpsTimeouts });
    } else {
      consecutiveGpsTimeouts = 0;
    }
    
    // ... send heartbeat
    
    consecutiveFailures = 0; // Reset on success
  } catch (err) {
    consecutiveFailures++;
    console.error('[Heartbeat] Error', { consecutiveFailures });
    
    if (consecutiveFailures >= 5) {
      // Alert developer or trigger diagnostic report
      Sentry.captureMessage('Heartbeat failing repeatedly', {
        extra: { consecutiveFailures, consecutiveGpsTimeouts }
      });
    }
  }
}, []);
```

### Backend Logging
```typescript
// In DriverHeartbeatHandler.ts
const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();

if (timeSinceLastHeartbeat > 10000) { // More than 2 heartbeat intervals
  logger.warn('Heartbeat gap detected', {
    userId,
    gapSeconds: timeSinceLastHeartbeat / 1000,
    previousStatus: driver.connectionStatus,
  });
}
```

---

## Summary

The STALE status issue is caused by a combination of:
1. **setInterval unreliability** on iOS (most critical)
2. **GPS timeout causing skipped heartbeats** (very common)
3. **No network retry logic** (accumulates failures)
4. **Optional background permission** (many users deny)

**Recommended immediate fixes**:
- Never skip heartbeats - always send with best available location
- Add retry logic for network failures
- Replace setInterval with BackgroundTimer

**Long-term fixes**:
- Make background permission mandatory for drivers
- Implement token refresh in background task
- Add comprehensive monitoring and alerting
