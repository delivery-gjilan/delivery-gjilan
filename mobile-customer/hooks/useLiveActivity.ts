import { useEffect, useRef, useCallback } from 'react';
import { Platform, NativeModules } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { REGISTER_LIVE_ACTIVITY_TOKEN } from '@/graphql/operations/notifications';

// Typed interface for the custom DeliveryLiveActivities native module
// (registered via RCT_EXTERN_MODULE in DeliveryLiveActivities.m)
interface DeliveryLiveActivitiesModule {
    startActivity(attributes: object, state: object): Promise<string>;
    updateActivity(activityId: string, state: object): Promise<string>;
    endActivity(activityId: string): Promise<void>;
    getPushToken(activityId: string): Promise<string>;
}

const DeliveryLiveActivitiesNative: DeliveryLiveActivitiesModule | undefined =
    (NativeModules as Record<string, unknown>).DeliveryLiveActivities as DeliveryLiveActivitiesModule | undefined;

interface DeliveryActivityState {
    driverName: string;
    estimatedMinutes: number;
    status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
    orderId: string;
    lastUpdated: number; // Unix timestamp ms
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
 */
export function useLiveActivity({ orderId, orderDisplayId, businessName, enabled = false }: UseLiveActivityOptions) {
    const activityIdRef = useRef<string | null>(null);
    const [registerToken] = useMutation(REGISTER_LIVE_ACTIVITY_TOKEN);

    // iOS version check: require 16.2+ for ActivityContent API
    const platformVersionRaw = Platform.Version;
    const iosVersionNumber = typeof platformVersionRaw === 'string'
        ? parseFloat(platformVersionRaw)
        : Number(platformVersionRaw);
    const isSupported =
        Platform.OS === 'ios' &&
        Number.isFinite(iosVersionNumber) &&
        iosVersionNumber >= 16.2 &&
        !!DeliveryLiveActivitiesNative;

    /**
     * Start a Live Activity for this delivery
     */
    const startLiveActivity = useCallback(async (initialState: Omit<DeliveryActivityState, 'orderId' | 'lastUpdated'>) => {
        if (!isSupported || !enabled) {
            console.log('[LiveActivity] Skipping: not supported or not enabled', {
                isSupported,
                enabled,
                hasNativeModule: !!DeliveryLiveActivitiesNative,
            });
            return null;
        }

        try {
            // If activity already exists, just update it
            if (activityIdRef.current) {
                console.log('[LiveActivity] Activity already exists, updating instead');
                await updateLiveActivity(initialState);
                return activityIdRef.current;
            }

            const attributes: DeliveryActivityAttributes = { orderDisplayId, businessName };

            const state: DeliveryActivityState = {
                ...initialState,
                orderId,
                lastUpdated: Date.now(),
            };

            console.log('[LiveActivity] Starting Live Activity', { orderId, attributes, state });

            const activityId = await DeliveryLiveActivitiesNative!.startActivity(attributes, state);
            activityIdRef.current = activityId;

            console.log('[LiveActivity] Live Activity started', { activityId });

            // Get push token and register with backend
            try {
                const pushToken = await DeliveryLiveActivitiesNative!.getPushToken(activityId);
                if (pushToken) {
                    console.log('[LiveActivity] Got push token, registering with backend', {
                        activityId,
                        tokenPreview: pushToken.substring(0, 30),
                    });
                    await registerToken({
                        variables: { token: pushToken, activityId, orderId },
                    });
                    console.log('[LiveActivity] Push token registered with backend');
                }
            } catch (tokenError) {
                console.error('[LiveActivity] Failed to register push token:', tokenError);
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
                lastUpdated: Date.now(),
            };

            console.log('[LiveActivity] Updating Live Activity', { activityId: activityIdRef.current, newState });

            await DeliveryLiveActivitiesNative!.updateActivity(activityIdRef.current, newState);
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
            await DeliveryLiveActivitiesNative!.endActivity(activityIdRef.current);
            activityIdRef.current = null;
            console.log('[LiveActivity] Live Activity ended');
        } catch (error) {
            console.error('[LiveActivity] Failed to end Live Activity:', error);
        }
    }, [isSupported]);

    // Safety net: if tracking is disabled (e.g. delivered/cancelled), end active activity.
    useEffect(() => {
        if (!enabled || !isSupported) {
            void endLiveActivity();
        }
    }, [enabled, isSupported, endLiveActivity]);

    return {
        startLiveActivity,
        updateLiveActivity,
        endLiveActivity,
        isSupported,
        activityId: activityIdRef.current,
    };
}
