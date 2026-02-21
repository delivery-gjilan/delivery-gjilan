import { useState, useCallback, useRef } from 'react';
import { fetchNavigationRoute, NavigationStep } from '@/utils/mapbox';

export interface RouteData {
  coordinates: Array<[number, number]>;
  steps: NavigationStep[];
  distance: number;
  duration: number;
}

interface UseNavigationRouteOptions {
  offRouteThreshold?: number;
  /**
   * Maximum number of reroutes allowed per order.
   * After this cap is reached, shouldReroute() always returns false until
   * resetRerouteCount() is called (e.g. on a new order).
   * Default: 3
   */
  maxReroutes?: number;
  /** Minimum gap between reroute triggers in ms, to prevent double-firing. Default: 10 000 */
  minRerouteGapMs?: number;
}

type LatLng = { latitude: number; longitude: number };

/**
 * Hook for managing navigation routes.
 *
 * Rerouting policy (low-call-count design for small-city use):
 * - No periodic timer — routes are only re-fetched when the driver is genuinely off-route.
 * - Capped at maxReroutes (default 3) per order.
 * - fetchNavigationRoute results are cached (5 min TTL) and in-flight-deduplicated
 *   in utils/mapbox.ts, so a re-fetch of the same route after a brief detour is free.
 *
 * ETA: do NOT derive ETA from route.duration directly.
 * Use computeRouteProgress() from utils/routeProgress.ts to get a live remainingDurationSec
 * without any API calls.
 */
export function useNavigationRoute(options: UseNavigationRouteOptions = {}) {
  const {
    offRouteThreshold = 80,
    maxReroutes = 3,
    minRerouteGapMs = 10_000,
  } = options;

  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeRequestIdRef = useRef<number>(0);
  const rerouteCountRef = useRef<number>(0);
  const lastRerouteAtRef = useRef<number>(0);

  const fetchRoute = useCallback(async (
    from: LatLng,
    to: LatLng,
    waypoints: LatLng[] = []
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

  /**
   * Returns true when the driver is off-route and a reroute should be triggered.
   * No periodic timer — only fires on genuine off-route events, up to maxReroutes times.
   * Call markRerouted() immediately after triggering a fetchRoute() based on this.
   */
  const shouldReroute = useCallback((
    _currentLocation: LatLng,
    isOffRoute: boolean,
  ): boolean => {
    if (!isOffRoute) return false;
    if (rerouteCountRef.current >= maxReroutes) return false;
    if (Date.now() - lastRerouteAtRef.current < minRerouteGapMs) return false;
    return true;
  }, [maxReroutes, minRerouteGapMs]);

  /** Call this immediately after triggering a reroute so the cap is tracked. */
  const markRerouted = useCallback(() => {
    rerouteCountRef.current += 1;
    lastRerouteAtRef.current = Date.now();
  }, []);

  /** Call this when a new order starts to reset the reroute cap. */
  const resetRerouteCount = useCallback(() => {
    rerouteCountRef.current = 0;
    lastRerouteAtRef.current = 0;
  }, []);

  return {
    route,
    isLoading,
    error,
    fetchRoute,
    clearRoute,
    shouldReroute,
    markRerouted,
    resetRerouteCount,
  };
}
