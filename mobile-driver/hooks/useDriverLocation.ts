import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface UseDriverLocationOptions {
  enabled?: boolean;
  smoothing?: boolean;
  distanceFilter?: number;
  timeInterval?: number;
}

/**
 * Hook for managing driver GPS location with filtering and smoothing
 * Prevents jitter, handles permissions, and provides stable location data
 */
export function useDriverLocation(options: UseDriverLocationOptions = {}) {
  const {
    enabled = true,
    smoothing = true,
    distanceFilter = 5,
    timeInterval = 2000,
  } = options;

  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationRef = useRef<DriverLocation | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Simple exponential moving average for smoothing
  const smoothLocation = (
    current: Location.LocationObjectCoords,
    previous: DriverLocation | null
  ): DriverLocation => {
    if (!smoothing || !previous) {
      return {
        latitude: current.latitude,
        longitude: current.longitude,
        altitude: current.altitude,
        accuracy: current.accuracy,
        heading: current.heading,
        speed: current.speed,
        timestamp: Date.now(),
      };
    }

    const alpha = 0.3; // Smoothing factor
    return {
      latitude: alpha * current.latitude + (1 - alpha) * previous.latitude,
      longitude: alpha * current.longitude + (1 - alpha) * previous.longitude,
      altitude: current.altitude,
      accuracy: current.accuracy,
      heading: current.heading ?? previous.heading,
      speed: current.speed ?? previous.speed,
      timestamp: Date.now(),
    };
  };

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (!mounted) return;

        if (status !== 'granted') {
          setPermissionGranted(false);
          setError('Location permission denied');
          return;
        }

        setPermissionGranted(true);
        setError(null);

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval,
            distanceInterval: distanceFilter,
          },
          (loc) => {
            if (!mounted) return;

            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateRef.current;

            // Throttle updates to prevent performance issues
            if (timeSinceLastUpdate < 500) return;

            const smoothedLocation = smoothLocation(loc.coords, locationRef.current);
            
            locationRef.current = smoothedLocation;
            lastUpdateRef.current = now;
            setLocation(smoothedLocation);
          }
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Location error');
      }
    };

    initLocation();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
    };
  }, [enabled, distanceFilter, timeInterval, smoothing]);

  return {
    location,
    locationRef,
    permissionGranted,
    error,
    isTracking: !!subscriptionRef.current,
  };
}
