import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchNavigationRoute, NavigationStep } from '@/utils/mapbox';

export interface RouteData {
  coordinates: Array<[number, number]>;
  steps: NavigationStep[];
  distance: number;
  duration: number;
}

interface UseNavigationRouteOptions {
  rerouteInterval?: number;
  offRouteThreshold?: number;
}

/**
 * Hook for managing navigation routes
 * Handles route fetching, rerouting, and route progress
 */
export function useNavigationRoute(options: UseNavigationRouteOptions = {}) {
  const {
    rerouteInterval = 30000,
    offRouteThreshold = 80,
  } = options;

  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastRerouteRef = useRef<number>(0);
  const routeRequestIdRef = useRef<number>(0);

  const fetchRoute = useCallback(async (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    waypoints: Array<{ latitude: number; longitude: number }> = []
  ) => {
    const requestId = ++routeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchNavigationRoute(from, to, waypoints);

      // Ignore stale requests
      if (requestId !== routeRequestIdRef.current) return;

      if (!result) {
        setError('Failed to fetch route');
        setRoute(null);
        return;
      }

      setRoute({
        coordinates: result.coordinates,
        steps: result.steps,
        distance: result.distanceKm * 1000,
        duration: result.durationMin * 60,
      });

      lastRerouteRef.current = Date.now();
    } catch (err) {
      if (requestId !== routeRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Route fetch failed');
      setRoute(null);
    } finally {
      if (requestId === routeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
    setIsLoading(false);
    routeRequestIdRef.current++;
  }, []);

  const shouldReroute = useCallback((
    currentLocation: { latitude: number; longitude: number },
    isOffRoute: boolean
  ): boolean => {
    const now = Date.now();
    const timeSinceLastReroute = now - lastRerouteRef.current;

    // Reroute if off route
    if (isOffRoute && timeSinceLastReroute > 10000) {
      return true;
    }

    // Periodic reroute for traffic updates
    if (timeSinceLastReroute > rerouteInterval) {
      return true;
    }

    return false;
  }, [rerouteInterval]);

  return {
    route,
    isLoading,
    error,
    fetchRoute,
    clearRoute,
    shouldReroute,
    lastRerouteTime: lastRerouteRef.current,
  };
}
