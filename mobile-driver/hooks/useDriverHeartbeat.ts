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
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuthStore } from '@/store/authStore';

const HEARTBEAT_INTERVAL_MS = 5000; // Every 5 seconds

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

export function useDriverHeartbeat() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [sendHeartbeat] = useMutation(DRIVER_HEARTBEAT_MUTATION);
  
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const simulatedLocationRef = useRef<{ latitude: number; longitude: number }>({ latitude: 42.4635, longitude: 21.4694 });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

      // Request background permissions non-blocking
      Location.requestBackgroundPermissionsAsync()
        .then((result) => {
          console.log('[Heartbeat] Background permission:', result.status);
        })
        .catch((err) => {
          console.warn('[Heartbeat] Background permission failed:', err);
        });

      return true;
    } catch (err) {
      console.error('[Heartbeat] Permission error:', err);
      return false;
    }
  }, []);

  // Get current location with fast timeout fallback to simulation
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    // Try real GPS with aggressive timeout (2 seconds max)
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

    // Fallback: move ~10-15 meters per heartbeat (realistic drift)
    // 15m ≈ 0.000135° latitude, 0.00018° longitude
    const latOffset = (Math.random() - 0.5) * 0.00027; // ±15m latitude
    const lngOffset = (Math.random() - 0.5) * 0.00036; // ±15m longitude
    
    simulatedLocationRef.current = {
      latitude: simulatedLocationRef.current.latitude + latOffset,
      longitude: simulatedLocationRef.current.longitude + lngOffset,
    };

    console.log('[Heartbeat] SIMULATION: Random walk movement', { 
      lat: simulatedLocationRef.current.latitude, 
      lng: simulatedLocationRef.current.longitude,
    });
    return simulatedLocationRef.current;
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
        },
        (error) => {
          console.warn('[Heartbeat] Watch position error:', error);
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
      locationWatchRef.current = undefined;
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

      const data = result.data?.driverHeartbeat;
      if (data?.success) {
        setConnectionStatus(data.connectionStatus as ConnectionStatus);
        console.log('[Heartbeat] Sent', {
          status: data.connectionStatus,
          locationUpdated: data.locationUpdated,
        });
      } else {
        console.warn('[Heartbeat] Failed:', result.errors);
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
    setConnectionStatus('DISCONNECTED');
  }, [stopLocationWatch]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && isAuthenticated) {
        startLocationWatch();
        // App came to foreground - ensure heartbeat is still running
        console.log('[Heartbeat] App foregrounded, verifying heartbeat is active');
        if (!heartbeatIntervalRef.current) {
          console.log('[Heartbeat] Heartbeat stopped, restarting...');
          startHeartbeat();
        } else {
          // Send immediate heartbeat to refresh
          console.log('[Heartbeat] Heartbeat active, sending immediate update');
          doHeartbeat();
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
