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

const HEARTBEAT_INTERVAL_MS = 5000; // Every 5 seconds
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
  try {
    const token = await getValidAccessToken(0);
    const endpoint = process.env.EXPO_PUBLIC_API_URL;

    if (!token || !endpoint) {
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

    if (!response.ok) {
      console.warn('[Heartbeat][Background] Request failed with status', response.status);
    }
  } catch (error) {
    console.warn('[Heartbeat][Background] Failed:', error);
  }
}

if (!TaskManager.isTaskDefined(BACKGROUND_HEARTBEAT_TASK)) {
  TaskManager.defineTask(BACKGROUND_HEARTBEAT_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[Heartbeat][Background] Task error:', error);
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
  const [sendHeartbeat] = useMutation(DRIVER_HEARTBEAT_MUTATION);
  
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

  const startBackgroundHeartbeat = useCallback(async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK);
      if (hasStarted) {
        return;
      }

      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== 'granted') {
        console.warn('[Heartbeat] Background permission not granted');
        return;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_HEARTBEAT_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: HEARTBEAT_INTERVAL_MS,
        distanceInterval: 5,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Driver tracking active',
          notificationBody: 'Updating your delivery location in background',
        },
      });

      console.log('[Heartbeat] Background heartbeat started');
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
      console.log('[Heartbeat] Using Navigation SDK location', navLocationState.location);
      return navLocationState.location;
    }

    // Priority 2: Use cached location from location watch
    if (lastLocationRef.current) {
      console.log('[Heartbeat] Using cached location from watch');
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
      ]) as any;
      
      if (location) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log('[Heartbeat] Got fresh GPS', coords);
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
        console.log('[Heartbeat] Using last known position from system');
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
          console.log('[Heartbeat] Watch location update', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
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

  // Send heartbeat to server with retry logic
  const doHeartbeat = useCallback(async (isRetry = false) => {
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
      } else {
        // Only mark as potentially stale after retry also fails
        setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
      }
    }
  }, [getCurrentLocation, getNavigationEtaPayload, sendHeartbeat]);

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
    await startBackgroundHeartbeat();
    console.log('[Heartbeat] Starting (interval: 5s)');
    await doHeartbeat();

    // Start interval
    heartbeatIntervalRef.current = setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [requestPermissions, doHeartbeat, startLocationWatch]);

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
        // App came to foreground – ensure the foreground heartbeat interval is running.
        // Don't send an immediate extra heartbeat here; the background task may have
        // just fired and the interval will pick up naturally on its next tick.
        if (!heartbeatIntervalRef.current) {
          console.log('[Heartbeat] Heartbeat stopped while backgrounded, restarting...');
          startHeartbeat();
        } else {
          console.log('[Heartbeat] App foregrounded, heartbeat interval active');
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, startHeartbeat, doHeartbeat, startLocationWatch]);

  // Main effect - start/stop based on auth only
  // Keep heartbeat active even if the driver toggles offline preference
  useEffect(() => {
    console.log('[Heartbeat] State changed', { isAuthenticated });

    if (isAuthenticated) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [isAuthenticated, startHeartbeat, stopHeartbeat]);

  return { connectionStatus };
}
