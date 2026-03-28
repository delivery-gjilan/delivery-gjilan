import { useState, useEffect, useCallback } from 'react';
import { NavigationStep } from '@/utils/mapbox';

/**
 * Haversine distance (reused from off-route detection)
 */
function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
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
 * Hook for tracking turn-by-turn navigation steps
 * Smoothly transitions between steps based on driver location
 */
export function useNavigationSteps(
  steps: NavigationStep[],
  driverLocation: { latitude: number; longitude: number } | null
) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = steps[currentStepIndex] ?? null;
  const nextStep = steps[currentStepIndex + 1] ?? null;

  // Update current step based on proximity
  useEffect(() => {
    if (!driverLocation || steps.length === 0) return;

    let bestIdx = currentStepIndex;
    let bestDist = Infinity;

    // Check remaining steps to find closest
    for (let i = currentStepIndex; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;

      const dist = haversineDistance(driverLocation, {
        latitude: step.maneuverLocation[1],
        longitude: step.maneuverLocation[0],
      });

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    // Advance to next step if close enough
    if (bestDist < 30 && bestIdx < steps.length - 1) {
      bestIdx += 1;
    }

    if (bestIdx !== currentStepIndex) {
      setCurrentStepIndex(bestIdx);
    }
  }, [driverLocation, steps, currentStepIndex]);

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  return {
    currentStep,
    nextStep,
    currentStepIndex,
    totalSteps: steps.length,
    progress: steps.length > 0 ? (currentStepIndex / steps.length) * 100 : 0,
    reset,
  };
}
