import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - react-native-live-activities has incomplete TypeScript definitions
import LiveActivities from 'react-native-live-activities';
import { useMutation } from '@apollo/client/react';
import { REGISTER_LIVE_ACTIVITY_TOKEN } from '@/graphql/operations/notifications';

interface DeliveryActivityState {
    driverName: string;
    estimatedMinutes: number;
    status: 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
    orderId: string;
    lastUpdated: Date;
}

interface DeliveryActivityAttributes {
    orderDisplayId: string;
    businessName: string;
}

interface UseLiveActivityOptions {
    orderId: string;
    orderDisplayId: string;
    businessName: string;
    enabled?: boolean; // Only start Live Activity when enabled
}

/**
 * Hook to manage Live Activities (Dynamic Island) for delivery tracking.
 * 
 * Features:
 * - Automatically starts Live Activity when order is OUT_FOR_DELIVERY
 * - Updates ETA in real-time
 * - Ends Live Activity when order is DELIVERED or CANCELLED
 * - Registers push token with backend for remote updates
 * 
 * @example
 * const { startLiveActivity, updateLiveActivity, endLiveActivity } = useLiveActivity({
 *   orderId: order.id,
 *   orderDisplayId: order.displayId,
 *   businessName: business.name,
 *   enabled: order.status === 'OUT_FOR_DELIVERY'
 * });
 * 
 * // Update ETA
 * updateLiveActivity({
 *   driverName: driver.firstName,
 *   estimatedMinutes: 15,
 *   status: 'out_for_delivery'
 * });
 */
export function useLiveActivity({ orderId, orderDisplayId, businessName, enabled = false }: UseLiveActivityOptions) {
    const activityIdRef = useRef<string | null>(null);
    const [registerToken] = useMutation(REGISTER_LIVE_ACTIVITY_TOKEN);

    // Check if Live Activities are supported and enabled
    const isSupported = Platform.OS === 'ios' && Platform.Version >= '16.2';

    /**
     * Start a Live Activity for this delivery
     */
    const startLiveActivity = useCallback(async (initialState: Omit<DeliveryActivityState, 'orderId' | 'lastUpdated'>) => {
        if (!isSupported || !enabled) {
            console.log('[LiveActivity] Skipping: not supported or not enabled', { isSupported, enabled });
            return null;
        }

        try {
            // If activity already exists, just update it
            if (activityIdRef.current) {
                console.log('[LiveActivity] Activity already exists, updating instead');
                await updateLiveActivity(initialState);
                return activityIdRef.current;
            }

            const attributes: DeliveryActivityAttributes = {
                orderDisplayId,
                businessName,
            };

            const state: DeliveryActivityState = {
                ...initialState,
                orderId,
                lastUpdated: new Date(),
            };

            console.log('[LiveActivity] Starting Live Activity', { orderId, attributes, state });

            // Start the Live Activity
            // @ts-ignore - TypeScript definitions incomplete
            const activityId = await LiveActivities.startActivity(attributes, state);
            activityIdRef.current = activityId;

            console.log('[LiveActivity] Live Activity started', { activityId });

            // Get the push token for this Live Activity and register with backend
            try {
                // @ts-ignore - TypeScript definitions incomplete
                const pushToken = await LiveActivities.getPushToken(activityId);
                if (pushToken) {
                    console.log('[LiveActivity] Got push token, registering with backend', { 
                        activityId, 
                        tokenPreview: pushToken.substring(0, 30) 
                    });

                    await registerToken({
                        variables: {
                            token: pushToken,
                            activityId,
                            orderId,
                        },
                    });

                    console.log('[LiveActivity] Push token registered with backend');
                }
            } catch (tokenError) {
                console.error('[LiveActivity] Failed to register push token:', tokenError);
                // Don't fail the whole operation if token registration fails
            }

            return activityId;
        } catch (error) {
            console.error('[LiveActivity] Failed to start Live Activity:', error);
            return null;
        }
    }, [isSupported, enabled, orderId, orderDisplayId, businessName, registerToken]);

    /**
     * Update the Live Activity with new data (e.g., updated ETA)
     */
    const updateLiveActivity = useCallback(async (updates: Omit<DeliveryActivityState, 'orderId' | 'lastUpdated'>) => {
        if (!isSupported || !activityIdRef.current) {
            return;
        }

        try {
            const newState: DeliveryActivityState = {
                ...updates,
                orderId,
                lastUpdated: new Date(),
            };

            console.log('[LiveActivity] Updating Live Activity', { activityId: activityIdRef.current, newState });

            // @ts-ignore - TypeScript definitions incomplete
            await LiveActivities.updateActivity(activityIdRef.current, newState);
        } catch (error) {
            console.error('[LiveActivity] Failed to update Live Activity:', error);
        }
    }, [isSupported, orderId]);

    /**
     * End the Live Activity (call when order is delivered or cancelled)
     */
    const endLiveActivity = useCallback(async () => {
        if (!isSupported || !activityIdRef.current) {
            return;
        }

        try {
            console.log('[LiveActivity] Ending Live Activity', { activityId: activityIdRef.current });

            // @ts-ignore - TypeScript definitions incomplete
            await LiveActivities.endActivity(activityIdRef.current);
            activityIdRef.current = null;

            console.log('[LiveActivity] Live Activity ended');
        } catch (error) {
            console.error('[LiveActivity] Failed to end Live Activity:', error);
        }
    }, [isSupported, orderId]);

    // Cleanup: end Live Activity when component unmounts
    useEffect(() => {
        return () => {
            if (activityIdRef.current) {
                // @ts-ignore - TypeScript definitions incomplete
                LiveActivities.endActivity(activityIdRef.current).catch(console.error);
            }
        };
    }, []);

    return {
        startLiveActivity,
        updateLiveActivity,
        endLiveActivity,
        isSupported,
        activityId: activityIdRef.current,
    };
}
