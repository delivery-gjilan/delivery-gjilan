import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

interface SimulationOptions {
  speedKmh?: number; // Simulation speed in km/h
  updateIntervalMs?: number; // How often to update position
}

export interface SimulationSnapshot {
  isSimulating: boolean;
  simulatedLocation: Location.LocationObjectCoords | null;
  routeCoordinates: Array<[number, number]>;
  currentIndex: number;
  progress: number;
  lastBearing: number;
}

interface UseNavigationSimulationReturn {
  isSimulating: boolean;
  simulatedLocation: Location.LocationObjectCoords | null;
  startSimulation: (routeCoordinates: Array<[number, number]>) => void;
  stopSimulation: () => void;
  toggleSimulation: () => void;
  getSimulationSnapshot: () => SimulationSnapshot;
  restoreSimulationSnapshot: (snapshot: SimulationSnapshot | null) => void;
}

/**
 * Hook for simulating GPS movement along a route
 * Useful for testing navigation without physically moving
 */
export function useNavigationSimulation(
  options: SimulationOptions = {}
): UseNavigationSimulationReturn {
  const {
    speedKmh = 40, // Default: 40 km/h (realistic city driving)
    updateIntervalMs = 1000, // Update every second
  } = options;

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState<Location.LocationObjectCoords | null>(null);
  
  const routeCoordsRef = useRef<Array<[number, number]>>([]);
  const currentIndexRef = useRef(0);
  const progressRef = useRef(0); // Progress between current and next point (0-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBearingRef = useRef<number>(0); // Track last bearing for smooth transitions

  // Calculate bearing between two points
  const calculateBearing = useCallback((
    from: [number, number],
    to: [number, number]
  ): number => {
    const [lon1, lat1] = from;
    const [lon2, lat2] = to;

    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }, []);

  // Calculate distance between two points (Haversine)
  const calculateDistance = useCallback((
    from: [number, number],
    to: [number, number]
  ): number => {
    const [lon1, lat1] = from;
    const [lon2, lat2] = to;

    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Interpolate between two points
  const interpolate = useCallback((
    from: [number, number],
    to: [number, number],
    progress: number
  ): [number, number] => {
    const [lon1, lat1] = from;
    const [lon2, lat2] = to;
    
    const lon = lon1 + (lon2 - lon1) * progress;
    const lat = lat1 + (lat2 - lat1) * progress;
    
    return [lon, lat];
  }, []);

  // Smooth bearing interpolation (handles angle wrapping)
  const smoothBearing = useCallback((
    currentBearing: number,
    targetBearing: number,
    smoothingFactor: number = 0.3
  ): number => {
    // Calculate the shortest angular distance
    let diff = targetBearing - currentBearing;
    
    // Normalize to -180 to 180
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    // Apply smoothing
    const smoothedBearing = currentBearing + diff * smoothingFactor;
    
    // Normalize to 0-360
    return (smoothedBearing + 360) % 360;
  }, []);

  // Start simulation
  const startSimulation = useCallback((routeCoordinates: Array<[number, number]>) => {
    if (routeCoordinates.length < 2) {
      console.warn('[SIMULATION] Need at least 2 coordinates to simulate');
      return;
    }

    console.log('[SIMULATION] Starting with', routeCoordinates.length, 'coordinates');
    
    routeCoordsRef.current = routeCoordinates;
    currentIndexRef.current = 0;
    progressRef.current = 0;
    
    // Set initial position
    const firstCoord = routeCoordinates[0]!;
    const secondCoord = routeCoordinates[1]!;
    const [lon, lat] = firstCoord;
    const bearing = calculateBearing(firstCoord, secondCoord);
    lastBearingRef.current = bearing; // Initialize bearing tracking
    
    setSimulatedLocation({
      latitude: lat,
      longitude: lon,
      altitude: 0,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: bearing,
      speed: (speedKmh * 1000) / 3600, // Convert km/h to m/s
    });

    setIsSimulating(true);
  }, [speedKmh, calculateBearing]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    console.log('[SIMULATION] Stopping');
    setIsSimulating(false);
    setSimulatedLocation(null);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    currentIndexRef.current = 0;
    progressRef.current = 0;
  }, []);

  // Toggle simulation
  const toggleSimulation = useCallback(() => {
    if (isSimulating) {
      stopSimulation();
    } else if (routeCoordsRef.current.length >= 2) {
      startSimulation(routeCoordsRef.current);
    }
  }, [isSimulating, startSimulation, stopSimulation]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const coords = routeCoordsRef.current;
      const currentIdx = currentIndexRef.current;
      
      if (currentIdx >= coords.length - 1) {
        console.log('[SIMULATION] Reached end of route');
        stopSimulation();
        return;
      }

      const from = coords[currentIdx]!;
      const to = coords[currentIdx + 1]!;
      
      // Calculate distance between current and next point
      const segmentDistance = calculateDistance(from, to);
      
      // Calculate how much we move per interval (m/s * seconds)
      const speedMs = (speedKmh * 1000) / 3600;
      const distancePerInterval = speedMs * (updateIntervalMs / 1000);
      
      // Calculate progress increment
      const progressIncrement = segmentDistance > 0 ? distancePerInterval / segmentDistance : 1;
      
      // Update progress
      progressRef.current += progressIncrement;
      
      // Check if we've reached the next point
      if (progressRef.current >= 1) {
        currentIndexRef.current += 1;
        progressRef.current = 0;
        
        // Check if we're at the end
        if (currentIndexRef.current >= coords.length - 1) {
          const lastCoord = coords[coords.length - 1]!;
          const [lon, lat] = lastCoord;
          setSimulatedLocation({
            latitude: lat,
            longitude: lon,
            altitude: 0,
            accuracy: 5,
            altitudeAccuracy: null,
            heading: 0,
            speed: 0,
          });
          return;
        }
      }
      
      const newIdx = currentIndexRef.current;
      const newFrom = coords[newIdx]!;
      const newTo = coords[newIdx + 1]!;
      
      // Interpolate position
      const [lon, lat] = interpolate(newFrom, newTo, progressRef.current);
      
      // Calculate target bearing and smooth it
      const targetBearing = calculateBearing(newFrom, newTo);
      const smoothedBearing = smoothBearing(lastBearingRef.current, targetBearing, 0.4);
      lastBearingRef.current = smoothedBearing;
      
      setSimulatedLocation({
        latitude: lat,
        longitude: lon,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: null,
        heading: smoothedBearing,
        speed: speedMs,
      });
      
    }, updateIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSimulating, speedKmh, updateIntervalMs, calculateDistance, interpolate, calculateBearing, stopSimulation]);

  const getSimulationSnapshot = useCallback((): SimulationSnapshot => {
    return {
      isSimulating,
      simulatedLocation,
      routeCoordinates: routeCoordsRef.current,
      currentIndex: currentIndexRef.current,
      progress: progressRef.current,
      lastBearing: lastBearingRef.current,
    };
  }, [isSimulating, simulatedLocation]);

  const restoreSimulationSnapshot = useCallback((snapshot: SimulationSnapshot | null) => {
    if (!snapshot) return;

    routeCoordsRef.current = snapshot.routeCoordinates ?? [];
    currentIndexRef.current = snapshot.currentIndex ?? 0;
    progressRef.current = snapshot.progress ?? 0;
    lastBearingRef.current = snapshot.lastBearing ?? 0;
    setSimulatedLocation(snapshot.simulatedLocation ?? null);

    if (snapshot.isSimulating && routeCoordsRef.current.length >= 2) {
      setIsSimulating(true);
    } else {
      setIsSimulating(false);
    }
  }, []);

  return {
    isSimulating,
    simulatedLocation,
    startSimulation,
    stopSimulation,
    toggleSimulation,
    getSimulationSnapshot,
    restoreSimulationSnapshot,
  };
}
