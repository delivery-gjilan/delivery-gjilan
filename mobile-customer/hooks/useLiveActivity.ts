import { useEffect, useRef, useCallback } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { REGISTER_LIVE_ACTIVITY_TOKEN } from '@/graphql/operations/notifications';

// Typed interface for the custom DeliveryLiveActivities native module
// (registered via RCT_EXTERN_MODULE in DeliveryLiveActivities.m)
interface DeliveryLiveActivitiesModule {
    startActivity(attributes: object, state: object): Promise<string>;
    updateActivity(activityId: string, state: object): Promise<string>;
    endActivity(activityId: string): Promise<void>;
    getPushToken(activityId: string): Promise<string>;
    findActivityByOrderId(orderId: string): Promise<string | null>;
    addListener?(eventName: string): void;
    removeListeners?(count: number): void;
}

const DeliveryLiveActivitiesNative: DeliveryLiveActivitiesModule | undefined =
    (NativeModules as Record<string, unknown>).DeliveryLiveActivities as DeliveryLiveActivitiesModule | undefined;

const liveActivityEvents = DeliveryLiveActivitiesNative
    ? new NativeEventEmitter(DeliveryLiveActivitiesNative as never)
    : null;

type LiveActivityPushTokenEvent = {
    activityId?: string;
    orderId?: string;
    pushToken?: string;
};

interface DeliveryActivityState {
    driverName: string;
    estimatedMinutes: number;
    phaseInitialMinutes: number;
    phaseStartedAt: number;
    status: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered';
    language?: 'en' | 'al';
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

interface LiveActivityRuntimeOptions {
    orderId?: string;
    orderDisplayId?: string;
    businessName?: string;
    enabled?: boolean;
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
    const activityOrderIdRef = useRef<string | null>(null);
    const registeredPushTokenRef = useRef<string | null>(null);
    const lastPushTokenSyncAtRef = useRef(0);
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

    const resolveRuntimeOptions = useCallback(
        (runtime?: LiveActivityRuntimeOptions) => ({
            orderId: runtime?.orderId ?? orderId,
            orderDisplayId: runtime?.orderDisplayId ?? orderDisplayId,
            businessName: runtime?.businessName ?? businessName,
            enabled: runtime?.enabled ?? enabled,
        }),
        [businessName, enabled, orderDisplayId, orderId],
    );

    const syncPushToken = useCallback(async (activityId: string, resolvedOrderId: string, force = false) => {
        if (!isSupported || !activityId || !resolvedOrderId) {
            return;
        }

        const now = Date.now();
        if (!force && registeredPushTokenRef.current && now - lastPushTokenSyncAtRef.current < 30_000) {
            return;
        }

        try {
            const pushToken = await DeliveryLiveActivitiesNative!.getPushToken(activityId);
            lastPushTokenSyncAtRef.current = now;

            if (!pushToken || registeredPushTokenRef.current === pushToken) {
                return;
            }

            await registerToken({
                variables: { token: pushToken, activityId, orderId: resolvedOrderId },
            });
            registeredPushTokenRef.current = pushToken;
            console.log('[LiveActivity] Push token registered with backend', {
                activityId,
                orderId: resolvedOrderId,
                tokenPreview: pushToken.substring(0, 30),
            });
        } catch (tokenError) {
            console.error('[LiveActivity] Failed to sync push token:', tokenError);
        }
    }, [isSupported, registerToken]);

    /**
     * Start a Live Activity for this delivery
     */
    const startLiveActivity = useCallback(async (
        initialState: Omit<DeliveryActivityState, 'orderId' | 'lastUpdated'>,
        runtime?: LiveActivityRuntimeOptions,
    ) => {
        const resolved = resolveRuntimeOptions(runtime);

        if (!isSupported || !resolved.enabled || !resolved.orderId) {
            console.log('[LiveActivity] Skipping: not supported or not enabled', {
                isSupported,
                enabled: resolved.enabled,
                orderId: resolved.orderId,
                hasNativeModule: !!DeliveryLiveActivitiesNative,
            });
            return null;
        }

        try {
            if (activityOrderIdRef.current && activityOrderIdRef.current !== resolved.orderId) {
                activityIdRef.current = null;
                activityOrderIdRef.current = null;
            }

            if (!activityIdRef.current && DeliveryLiveActivitiesNative?.findActivityByOrderId) {
                const existingActivityId = await DeliveryLiveActivitiesNative.findActivityByOrderId(resolved.orderId);
                if (existingActivityId) {
                    activityIdRef.current = existingActivityId;
                    activityOrderIdRef.current = resolved.orderId;
                }
            }

            // If activity already exists, just update it
            if (activityIdRef.current) {
                console.log('[LiveActivity] Activity already exists, updating instead');
                await updateLiveActivity(initialState, runtime);
                return activityIdRef.current;
            }

            const attributes: DeliveryActivityAttributes = {
                orderDisplayId: resolved.orderDisplayId,
                businessName: resolved.businessName,
            };

            const state: DeliveryActivityState = {
                ...initialState,
                orderId: resolved.orderId,
                lastUpdated: Date.now(),
            };

            console.log('[LiveActivity] Starting Live Activity', { orderId: resolved.orderId, attributes, state });

            const activityId = await DeliveryLiveActivitiesNative!.startActivity(attributes, state);
            activityIdRef.current = activityId;
            activityOrderIdRef.current = resolved.orderId;

            console.log('[LiveActivity] Live Activity started', { activityId });

            await syncPushToken(activityId, resolved.orderId, true);

            return activityId;
        } catch (error) {
            console.error('[LiveActivity] Failed to start Live Activity:', error);
            return null;
        }
    }, [isSupported, resolveRuntimeOptions, syncPushToken]);

    /**
     * Update the Live Activity with new data (e.g., updated ETA)
     */
    const updateLiveActivity = useCallback(async (
        updates: Omit<DeliveryActivityState, 'orderId' | 'lastUpdated'>,
        runtime?: LiveActivityRuntimeOptions,
    ) => {
        if (!isSupported || !activityIdRef.current) {
            return;
        }

        try {
            const resolved = resolveRuntimeOptions(runtime);
            const newState: DeliveryActivityState = {
                ...updates,
                orderId: resolved.orderId,
                lastUpdated: Date.now(),
            };

            activityOrderIdRef.current = resolved.orderId;

            console.log('[LiveActivity] Updating Live Activity', { activityId: activityIdRef.current, newState });

            await DeliveryLiveActivitiesNative!.updateActivity(activityIdRef.current, newState);
            await syncPushToken(activityIdRef.current, resolved.orderId);
        } catch (error) {
            console.error('[LiveActivity] Failed to update Live Activity:', error);
        }
    }, [isSupported, resolveRuntimeOptions, syncPushToken]);

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
            activityOrderIdRef.current = null;
            registeredPushTokenRef.current = null;
            console.log('[LiveActivity] Live Activity ended');
        } catch (error) {
            console.error('[LiveActivity] Failed to end Live Activity:', error);
        }
    }, [isSupported]);

    useEffect(() => {
        if (!isSupported || !liveActivityEvents) {
            return;
        }

        const subscription = liveActivityEvents.addListener(
            'LiveActivityPushTokenUpdated',
            (event: LiveActivityPushTokenEvent) => {
                const eventActivityId = String(event.activityId ?? '');
                const eventOrderId = String(event.orderId ?? '');
                const eventPushToken = String(event.pushToken ?? '');

                if (!eventActivityId || !eventOrderId || !eventPushToken) {
                    return;
                }

                if (activityIdRef.current && activityIdRef.current !== eventActivityId) {
                    return;
                }

                if (activityOrderIdRef.current && activityOrderIdRef.current !== eventOrderId) {
                    return;
                }

                if (registeredPushTokenRef.current === eventPushToken) {
                    return;
                }

                void registerToken({
                    variables: { token: eventPushToken, activityId: eventActivityId, orderId: eventOrderId },
                })
                    .then(() => {
                        registeredPushTokenRef.current = eventPushToken;
                        lastPushTokenSyncAtRef.current = Date.now();
                        console.log('[LiveActivity] Rotated push token registered', {
                            activityId: eventActivityId,
                            orderId: eventOrderId,
                            tokenPreview: eventPushToken.substring(0, 30),
                        });
                    })
                    .catch((error) => {
                        console.error('[LiveActivity] Failed to register rotated push token:', error);
                    });
            },
        );

        return () => {
            subscription.remove();
        };
    }, [isSupported, registerToken]);

    useEffect(() => {
        if (!isSupported) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState !== 'active' || !activityIdRef.current || !activityOrderIdRef.current) {
                return;
            }

            void syncPushToken(activityIdRef.current, activityOrderIdRef.current, true);
        });

        return () => {
            subscription.remove();
        };
    }, [isSupported, syncPushToken]);

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
