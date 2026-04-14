/**
 * useDriverHeartbeat Hook
 * 
 * Application-level heartbeat for driver connection tracking.
 * 
 * Features:
 * - Sends heartbeat mutation every 5 seconds
 * - Includes current GPS location with each heartbeat
 * - Handles reconnection gracefully
 * - Location throttled server-side (every 10s or 5m movement)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from '@/lib/graphql/authSession';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import { useNavigationStore } from '@/store/navigationStore';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000; // Every 5 seconds
const ACTIVE_DELIVERY_HEARTBEAT_INTERVAL_MS = 2000; // Every 2 seconds when OUT_FOR_DELIVERY
const BACKGROUND_HEARTBEAT_TASK = 'driver-heartbeat-background-task';

const DRIVER_HEARTBEAT_MUTATION = gql`
  mutation DriverHeartbeat(
    $latitude: Float!
    $longitude: Float!
    $activeOrderId: ID
    $navigationPhase: String
    $remainingEtaSeconds: Int
  ) {
    driverHeartbeat(
      latitude: $latitude
      longitude: $longitude
      activeOrderId: $activeOrderId
      navigationPhase: $navigationPhase
      remainingEtaSeconds: $remainingEtaSeconds
    ) {
      success
      connectionStatus
      locationUpdated
      lastHeartbeatAt
    }
  }
`;

type ConnectionStatus = 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED';

const DRIVER_HEARTBEAT_MUTATION_TEXT = `
  mutation DriverHeartbeat(
    $latitude: Float!
    $longitude: Float!
    $activeOrderId: ID
    $navigationPhase: String
    $remainingEtaSeconds: Int
  ) {
    driverHeartbeat(
      latitude: $latitude
      longitude: $longitude
      activeOrderId: $activeOrderId
      navigationPhase: $navigationPhase
      remainingEtaSeconds: $remainingEtaSeconds
    ) {
      success
      connectionStatus
      locationUpdated
      lastHeartbeatAt
    }
  }
`;

async function sendBackgroundHeartbeat(latitude: number, longitude: number): Promise<void> {
  const endpoint = process.env.EXPO_PUBLIC_API_URL;
  if (!endpoint) return;

  const attemptRequest = async (): Promise<void> => {
    // getValidAccessToken refreshes the token automatically if near-expiry
    const token = await getValidAccessToken(30_000);
    if (!token) return;

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
      // Token rejected by server — force a fresh access token next time
      console.warn('[Heartbeat][Background] 401 received, will retry with refreshed token on next tick');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // GraphQL responds with HTTP 200 even for application-level errors
    let body: { errors?: Array<{ message: string }> } | null = null;
    try {
      body = await response.json() as typeof body;
    } catch {
      // Non-JSON body — not a fatal error for a heartbeat
    }
    if (body?.errors?.length) {
      console.warn('[Heartbeat][Background] GraphQL errors:', body.errors.map((e) => e.message));
    }
  };

  try {
    await attemptRequest();
  } catch (firstErr) {
    console.warn('[Heartbeat][Background] First attempt failed:', firstErr instanceof Error ? firstErr.message : firstErr);
    // Single retry after 2 s for transient network / server errors
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    try {
      await attemptRequest();
    } catch (retryErr) {
      console.warn('[Heartbeat][Background] Retry also failed:', retryErr instanceof Error ? retryErr.message : retryErr);
    }
  }
}

if (!TaskManager.isTaskDefined(BACKGROUND_HEARTBEAT_TASK)) {
  TaskManager.defineTask(BACKGROUND_HEARTBEAT_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[Heartbeat][Background] Task error:', error);
      return;
    }

    // If the driver logged out (or app was killed and store rehydrates as
    // unauthenticated), stop the background task so it doesn't keep GPS alive.
    const { token, user, appSessionActive } = useAuthStore.getState();
    if (!token || !user || !appSessionActive) {
      console.log('[Heartbeat][Background] Session inactive/unauthenticated — stopping background task');
      await Location.stopLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK).catch(() => {});
      return;
    }

    const locations = (data as { locations?: Array<{ coords?: { latitude: number; longitude: number } }> } | undefined)?.locations;
    const latest = locations?.[locations.length - 1];
    const coords = latest?.coords;

    if (!coords) {
      return;
    }

    await sendBackgroundHeartbeat(coords.latitude, coords.longitude);
  });
}

export function useDriverHeartbeat() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appSessionActive = useAuthStore((state) => state.appSessionActive);
  const navigationOrderStatus = useNavigationStore((state) => state.order?.status);
  const [sendHeartbeat] = useMutation(DRIVER_HEARTBEAT_MUTATION);
  
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeHeartbeatIntervalMsRef = useRef<number>(DEFAULT_HEARTBEAT_INTERVAL_MS);
  const backgroundIntervalMsRef = useRef<number | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastHeartbeatSentRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);

  const getHeartbeatIntervalMs = useCallback(() => {
    const navState = useNavigationStore.getState();
    const isOutForDelivery = navState.isNavigating && navState.order?.status === 'OUT_FOR_DELIVERY';
    return isOutForDelivery ? ACTIVE_DELIVERY_HEARTBEAT_INTERVAL_MS : DEFAULT_HEARTBEAT_INTERVAL_MS;
  }, []);

  const getNavigationEtaPayload = useCallback(() => {
    const navState = useNavigationStore.getState();
    if (!navState.isNavigating || !navState.order?.id) {
      return {};
    }

    if (navState.durationRemainingS == null || !Number.isFinite(navState.durationRemainingS)) {
      return {};
    }

    return {
      activeOrderId: navState.order.id,
      navigationPhase: navState.phase,
      remainingEtaSeconds: Math.max(0, Math.round(navState.durationRemainingS)),
    };
  }, []);

  const startBackgroundHeartbeat = useCallback(async (intervalMs: number) => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK);
      if (hasStarted && backgroundIntervalMsRef.current === intervalMs) {
        return;
      }

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK);
      }

      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== 'granted') {
        console.warn('[Heartbeat] Background permission not granted');
        return;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalMs,
        distanceInterval: 5,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Driver tracking active',
          notificationBody: 'Updating your delivery location in background',
        },
      });

      backgroundIntervalMsRef.current = intervalMs;
      console.log('[Heartbeat] Background heartbeat started', { intervalMs });
    } catch (error) {
      console.warn('[Heartbeat] Failed to start background heartbeat:', error);
    }
  }, []);

  const stopBackgroundHeartbeat = useCallback(async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK);
      if (!hasStarted) {
        return;
      }

      await Location.stopLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK);
      backgroundIntervalMsRef.current = null;
      console.log('[Heartbeat] Background heartbeat stopped');
    } catch (error) {
      console.warn('[Heartbeat] Failed to stop background heartbeat:', error);
    }
  }, []);

  // Request location permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Heartbeat] Requesting location permissions');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Enable location to show on the map.');
        return false;
      }

      const providerStatus = await Location.getProviderStatusAsync();
      console.log('[Heartbeat] Provider status', providerStatus);

      if (!providerStatus.locationServicesEnabled) {
        Alert.alert('Location Services Off', 'Turn on device location services to continue.');
        return false;
      }

      // Request background permission – recommended but not mandatory
      const bgResult = await Location.requestBackgroundPermissionsAsync();
      if (bgResult.status !== 'granted') {
        console.warn('[Heartbeat] Background location permission not granted - foreground only mode');
        Alert.alert(
          'Background Location Recommended',
          'For best tracking during deliveries, enable "Always" location access in Settings. You can continue for now with foreground tracking.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Continue Anyway', style: 'cancel' },
          ]
        );
        // Continue with foreground-only mode - don't block the driver
      }

      return true;
    } catch (err) {
      console.error('[Heartbeat] Permission error:', err);
      return false;
    }
  }, []);

  // Get current location with fast timeout fallback chain
  // NEVER returns null - always sends heartbeat with best available location
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number }> => {
    // Priority 1: Check for navigation SDK location (when actively navigating)
    const navLocationState = useNavigationLocationStore.getState();
    if (navLocationState.isFresh() && navLocationState.location) {
      if (__DEV__) console.log('[Heartbeat] Using Navigation SDK location', navLocationState.location);
      return navLocationState.location;
    }

    // Priority 2: Use cached location from location watch
    if (lastLocationRef.current) {
      if (__DEV__) console.log('[Heartbeat] Using cached location from watch');
      return lastLocationRef.current;
    }

    // Priority 3: Try real GPS with timeout (2 seconds max)
    try {
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GPS timeout')), 2000)
        ),
      ]) as Location.LocationObject;
      
      if (location) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        if (__DEV__) console.log('[Heartbeat] Got fresh GPS', coords);
        lastLocationRef.current = coords;
        return coords;
      }
    } catch (err) {
      console.warn('[Heartbeat] GPS timeout, checking fallbacks');
    }

    // Priority 4: Last known position from system (up to 5 minutes old)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000, requiredAccuracy: 200 });
      if (lastKnown) {
        const coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        if (__DEV__) console.log('[Heartbeat] Using last known position from system');
        lastLocationRef.current = coords;
        return coords;
      }
    } catch (err) {
      console.warn('[Heartbeat] Last known position unavailable');
    }

    // Priority 5: Use stale cached location if available
    if (lastLocationRef.current) {
      console.warn('[Heartbeat] Using stale cached location');
      return lastLocationRef.current;
    }

    // Priority 6: Hardcoded fallback (Gjilan city center) - LAST RESORT
    // Better to send heartbeat with approximate location than skip entirely
    console.error('[Heartbeat] No location available, using fallback coordinates (Gjilan center)');
    const fallbackCoords = { latitude: 42.6629, longitude: 20.2936 };
    lastLocationRef.current = fallbackCoords;
    return fallbackCoords;
  }, []);

  const startLocationWatch = useCallback(async () => {
    if (locationWatchRef.current) {
      return;
    }

    try {
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (location) => {
          lastLocationRef.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      );
      console.log('[Heartbeat] Location watch started');
      if (!lastLocationRef.current) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 60000,
            requiredAccuracy: 100,
          });
          if (lastKnown) {
            lastLocationRef.current = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
            console.log('[Heartbeat] Seeded location from last known');
          }
        } catch (err) {
          console.warn('[Heartbeat] Failed to seed last known location:', err);
        }
      }
    } catch (watchErr) {
      console.error('[Heartbeat] Watch setup failed:', watchErr);
      locationWatchRef.current = null;
    }
  }, []);

  const stopLocationWatch = useCallback(() => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
      console.log('[Heartbeat] Location watch stopped');
    }
  }, []);

  // Send heartbeat to server with exponential backoff retry
  const doHeartbeat = useCallback(async () => {
    try {
      const location = await getCurrentLocation(); // Now always returns a location

      lastLocationRef.current = location;
      // Keep the global store up-to-date so other screens can access the
      // driver's current position without needing their own location hook.
      useNavigationLocationStore.getState().setLastKnownCoords(location);

      const result = await sendHeartbeat({
        variables: {
          latitude: location.latitude,
          longitude: location.longitude,
          ...getNavigationEtaPayload(),
        },
      });

      const data = result.data?.driverHeartbeat;
      if (data?.success) {
        lastHeartbeatSentRef.current = Date.now();
        consecutiveFailuresRef.current = 0; // Reset backoff on success
        setConnectionStatus(data.connectionStatus as ConnectionStatus);
        useAuthStore.getState().setConnectionStatus(data.connectionStatus);
      } else {
        console.warn('[Heartbeat] Failed:', result.error);
      }
    } catch (err: unknown) {
      consecutiveFailuresRef.current += 1;
      const failures = consecutiveFailuresRef.current;

      // Exponential backoff: 2s, 4s, 8s, 16s, cap 30s + jitter (±20%)
      const baseDelay = Math.min(2000 * Math.pow(2, failures - 1), 30_000);
      const jitter = baseDelay * (0.8 + Math.random() * 0.4);
      const retryDelay = Math.round(jitter);

      console.error(`[Heartbeat] Error (failure #${failures}), retrying in ${retryDelay}ms:`, (err as Error).message);

      // Mark as STALE after 3 consecutive failures
      if (failures >= 3) {
        setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
      }

      setTimeout(() => doHeartbeat(), retryDelay);
    }
  }, [getCurrentLocation, getNavigationEtaPayload, sendHeartbeat]);

  const applyHeartbeatInterval = useCallback(async () => {
    const intervalMs = getHeartbeatIntervalMs();
    const previousMs = activeHeartbeatIntervalMsRef.current;

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(doHeartbeat, intervalMs);
    activeHeartbeatIntervalMsRef.current = intervalMs;

    await startBackgroundHeartbeat(intervalMs);

    if (previousMs !== intervalMs) {
      console.log('[Heartbeat] Interval changed', { fromMs: previousMs, toMs: intervalMs });
    } else {
      console.log('[Heartbeat] Interval applied', { intervalMs });
    }
  }, [doHeartbeat, getHeartbeatIntervalMs, startBackgroundHeartbeat]);

  // Start heartbeat loop
  const startHeartbeat = useCallback(async () => {
    if (heartbeatIntervalRef.current) {
      console.log('[Heartbeat] Already running');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return;
    }

    // Send immediate heartbeat
    await startLocationWatch();
    const initialIntervalMs = getHeartbeatIntervalMs();
    console.log('[Heartbeat] Starting', { intervalMs: initialIntervalMs });
    await doHeartbeat();

    // Start interval (adaptive by delivery phase)
    await applyHeartbeatInterval();
  }, [requestPermissions, doHeartbeat, startLocationWatch, getHeartbeatIntervalMs, applyHeartbeatInterval]);

  // Stop heartbeat loop
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('[Heartbeat] Stopped');
    }
    stopLocationWatch();
    stopBackgroundHeartbeat();
    setConnectionStatus('DISCONNECTED');
  }, [stopLocationWatch, stopBackgroundHeartbeat]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && isAuthenticated) {
        startLocationWatch();

        // iOS suspends JS timers in background — setInterval stops firing but
        // the ref is never cleared. Detect this by checking when we last
        // successfully sent a heartbeat. If it's been more than 3× the
        // expected interval, the timer is effectively dead.
        const timeSinceLastHb = Date.now() - lastHeartbeatSentRef.current;
        const expectedInterval = getHeartbeatIntervalMs();
        const isIntervalStale = timeSinceLastHb > expectedInterval * 3;

        if (!heartbeatIntervalRef.current || isIntervalStale) {
          // Kill any zombie interval ref before restarting
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          console.log('[Heartbeat] Heartbeat stale/stopped while backgrounded, restarting...', { timeSinceLastHb });
          startHeartbeat();
        } else {
          // Interval still alive — send one immediate heartbeat to recover
          // status quickly, then let the interval continue.
          doHeartbeat();
          applyHeartbeatInterval();
          console.log('[Heartbeat] App foregrounded, immediate heartbeat + interval reapplied');
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, startHeartbeat, startLocationWatch, applyHeartbeatInterval]);

  // Re-apply interval when delivery phase/status changes (2s on OUT_FOR_DELIVERY, 5s otherwise)
  useEffect(() => {
    if (!isAuthenticated || !heartbeatIntervalRef.current) {
      return;
    }

    applyHeartbeatInterval();
  }, [isAuthenticated, navigationOrderStatus, applyHeartbeatInterval]);

  // Main effect - start/stop based on auth only
  // Keep heartbeat active even if the driver toggles offline preference
  useEffect(() => {
    console.log('[Heartbeat] State changed', { isAuthenticated, appSessionActive });

    if (isAuthenticated && appSessionActive) {
      startHeartbeat();
    } else {
      // Stop foreground + background heartbeat. This also handles the case
      // where the app was killed and relaunched — the old OS-level background
      // location task may still be running from the previous session.
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [isAuthenticated, startHeartbeat, stopHeartbeat]);

  return { connectionStatus };
}
