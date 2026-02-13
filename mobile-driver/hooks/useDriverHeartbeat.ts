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
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
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

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (err) {
      console.warn('[Heartbeat] Failed to get current location:', err);
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch (err) {
      console.warn('[Heartbeat] Failed to get last known location:', err);
    }

    // Fall back to last successful heartbeat location
    return lastLocationRef.current;
  }, []);

  // Send heartbeat to server
  const doHeartbeat = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      const locationToSend = location ?? lastLocationRef.current;

      if (!locationToSend) {
        console.warn('[Heartbeat] No location available, skipping');
        return;
      }

      lastLocationRef.current = locationToSend;

      const result = await sendHeartbeat({
        variables: {
          latitude: locationToSend.latitude,
          longitude: locationToSend.longitude,
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
    console.log('[Heartbeat] Starting (interval: 5s)');
    await doHeartbeat();

    // Start interval
    heartbeatIntervalRef.current = setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [requestPermissions, doHeartbeat]);

  // Stop heartbeat loop
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('[Heartbeat] Stopped');
    }
    setConnectionStatus('DISCONNECTED');
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && isAuthenticated) {
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
  }, [isAuthenticated, startHeartbeat, doHeartbeat]);

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
