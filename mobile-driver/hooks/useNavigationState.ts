import { useState, useCallback } from 'react';

export type NavigationState =
  | 'idle'
  | 'overview'
  | 'navigating_to_pickup'
  | 'navigating_to_dropoff'
  | 'arrived';

export interface NavigationContext {
  orderId: string | null;
  pickupLocation: { latitude: number; longitude: number } | null;
  dropoffLocation: { latitude: number; longitude: number } | null;
}

/**
 * State machine for navigation flow
 * Replaces boolean chaos with explicit states
 */
export function useNavigationState() {
  const [state, setState] = useState<NavigationState>('idle');
  const [context, setContext] = useState<NavigationContext>({
    orderId: null,
    pickupLocation: null,
    dropoffLocation: null,
  });

  const startNavigation = useCallback((
    orderId: string,
    pickup: { latitude: number; longitude: number },
    dropoff: { latitude: number; longitude: number }
  ) => {
    setContext({ orderId, pickupLocation: pickup, dropoffLocation: dropoff });
    setState('navigating_to_pickup');
  }, []);

  const markPickupComplete = useCallback(() => {
    setState('navigating_to_dropoff');
  }, []);

  const markDeliveryComplete = useCallback(() => {
    setState('arrived');
  }, []);

  const setNavigatingToPickup = useCallback(() => {
    setState('navigating_to_pickup');
  }, []);

  const setNavigatingToDropoff = useCallback(() => {
    setState('navigating_to_dropoff');
  }, []);

  const stopNavigation = useCallback(() => {
    setState('overview');
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setContext({
      orderId: null,
      pickupLocation: null,
      dropoffLocation: null,
    });
  }, []);

  const showOverview = useCallback(() => {
    setState('overview');
  }, []);

  return {
    state,
    context,
    isNavigating: state === 'navigating_to_pickup' || state === 'navigating_to_dropoff',
    isNavigatingToPickup: state === 'navigating_to_pickup',
    isNavigatingToDropoff: state === 'navigating_to_dropoff',
    isInOverview: state === 'overview',
    startNavigation,
    markPickupComplete,
    markDeliveryComplete,
    setNavigatingToPickup,
    setNavigatingToDropoff,
    stopNavigation,
    showOverview,
    reset,
  };
}
