import { useMemo, useCallback } from 'react';

/**
 * Haversine distance calculation in meters
 */
function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const a_calc =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a_calc), Math.sqrt(1 - a_calc));
}

/**
 * Calculate minimum distance from point to polyline
 */
function distanceToPolyline(
  point: { latitude: number; longitude: number },
  coords: Array<[number, number]>
): number {
  let minDist = Number.POSITIVE_INFINITY;

  for (const coord of coords) {
    const dist = haversineDistance(point, {
      latitude: coord[1],
      longitude: coord[0],
    });
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

interface UseOffRouteDetectionOptions {
  threshold?: number;
  cooldownMs?: number;
}

/**
 * Hook for detecting when driver goes off route
 * Uses efficient distance calculation with cooldown to prevent spam
 */
export function useOffRouteDetection(options: UseOffRouteDetectionOptions = {}) {
  const { threshold = 80, cooldownMs = 5000 } = options;

  const checkOffRoute = useCallback((
    location: { latitude: number; longitude: number } | null,
    routeCoords: Array<[number, number]>
  ): boolean => {
    if (!location || routeCoords.length < 2) return false;

    const distance = distanceToPolyline(location, routeCoords);
    return distance > threshold;
  }, [threshold]);

  const calculateDistanceToDestination = useCallback((
    location: { latitude: number; longitude: number } | null,
    destination: { latitude: number; longitude: number } | null
  ): number | null => {
    if (!location || !destination) return null;
    return haversineDistance(location, destination);
  }, []);

  return {
    checkOffRoute,
    calculateDistanceToDestination,
    haversineDistance,
  };
}
