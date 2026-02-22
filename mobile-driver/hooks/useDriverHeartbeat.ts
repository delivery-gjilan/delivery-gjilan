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
import { getToken } from '@/utils/secureTokenStore';
import { useDriverLocationOverrideStore } from '@/store/driverLocationOverrideStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';

const HEARTBEAT_INTERVAL_MS = 5000; // Every 5 seconds
const BACKGROUND_HEARTBEAT_TASK = 'driver-heartbeat-background-task';

const DRIVER_HEARTBEAT_MUTATION = gql`
  mutation DriverHeartbeat($latitude: Float!, $longitude: Float!) {
    driverHeartbeat(latitude: $latitude, longitude: $longitude) {
      success
      connectionStatus
      locationUpdated
      lastHeartbeatAt
    }
  }
`;

type ConnectionStatus = 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED';

const DRIVER_HEARTBEAT_MUTATION_TEXT = `
  mutation DriverHeartbeat($latitude: Float!, $longitude: Float!) {
    driverHeartbeat(latitude: $latitude, longitude: $longitude) {
      success
      connectionStatus
      locationUpdated
      lastHeartbeatAt
    }
  }
`;

async function sendBackgroundHeartbeat(latitude: number, longitude: number): Promise<void> {
  try {
    const token = await getToken();
    const endpoint = process.env.EXPO_PUBLIC_API_URL;

    if (!token || !endpoint) {
      return;
    }

    // Decode JWT payload to check expiry without a full verify (no secret needed here).
    // Avoids silent 401s when the token has expired while the app was backgrounded.
    try {
      const payloadB64 = token.split('.')[1];
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64)) as { exp?: number };
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          console.warn('[Heartbeat][Background] JWT expired – skipping heartbeat until foreground refresh');
          return;
        }
      }
    } catch {
      // Malformed token – skip
      console.warn('[Heartbeat][Background] Could not decode JWT, skipping heartbeat');
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
  const simulatedLocationRef = useRef<{ latitude: number; longitude: number }>({ latitude: 42.4635, longitude: 21.4694 });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

      // Request background permission – blocking so we know the result before
      // attempting startLocationUpdatesAsync. iOS only shows the system dialog once;
      // subsequent denials must be handled by directing the user to Settings.
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
        // Continue without background tracking – foreground-only mode
      }

      return true;
    } catch (err) {
      console.error('[Heartbeat] Permission error:', err);
      return false;
    }
  }, []);

  // Get current location with fast timeout fallback to simulation
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    // Priority 1: Check for navigation SDK location (when actively navigating)
    const navLocationState = useNavigationLocationStore.getState();
    if (navLocationState.isFresh() && navLocationState.location) {
      console.log('[Heartbeat] Using Navigation SDK location', navLocationState.location);
      return navLocationState.location;
    }

    // Priority 2: Manual simulation override
    const overrideState = useDriverLocationOverrideStore.getState();
    if (overrideState.isSimulationOverrideEnabled && overrideState.locationOverride) {
      return overrideState.locationOverride;
    }

    // Priority 3: Try real GPS with aggressive timeout (2 seconds max)
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
        console.log('[Heartbeat] Got real GPS', { lat: location.coords.latitude, lng: location.coords.longitude });
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }
    } catch (err) {
      console.warn('[Heartbeat] GPS failed or timed out, using simulation');
    }

    // Fallback: simulate location only in development builds.
    // In production we skip the heartbeat rather than send false coordinates.
    if (__DEV__) {
      // Move ~10-15 meters per heartbeat (realistic drift for dev testing)
      const latOffset = (Math.random() - 0.5) * 0.00027; // ±15m latitude
      const lngOffset = (Math.random() - 0.5) * 0.00036; // ±15m longitude

      simulatedLocationRef.current = {
        latitude: simulatedLocationRef.current.latitude + latOffset,
        longitude: simulatedLocationRef.current.longitude + lngOffset,
      };

      console.log('[Heartbeat] DEV SIMULATION: Random walk movement', {
        lat: simulatedLocationRef.current.latitude,
        lng: simulatedLocationRef.current.longitude,
      });
      return simulatedLocationRef.current;
    }

    // Production: GPS unavailable – caller will skip this heartbeat
    console.warn('[Heartbeat] GPS unavailable, skipping heartbeat');
    return null;
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

  // Send heartbeat to server
  const doHeartbeat = useCallback(async () => {
    try {
      const location = await getCurrentLocation();

      if (!location) {
        console.warn('[Heartbeat] No location available, skipping');
        return;
      }

      lastLocationRef.current = location;

      const result = await sendHeartbeat({
        variables: {
          latitude: location.latitude,
          longitude: location.longitude,
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
      // Network error - mark as potentially stale
      setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
    }
  }, [getCurrentLocation, sendHeartbeat]);

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
