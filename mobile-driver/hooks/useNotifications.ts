import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { REGISTER_DEVICE_TOKEN, UNREGISTER_DEVICE_TOKEN, TRACK_PUSH_TELEMETRY } from '@/graphql/operations/notifications';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { useRouter } from 'expo-router';

// ── Configure foreground notification behavior ─────────────────────
// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Hook that manages push notification lifecycle for the driver app:
 * - Requests permission
 * - Gets FCM/APNs device token
 * - Registers token with API
 * - Handles foreground + background notification tap navigation
 * - Cleans up on logout
 *
 * Must be called inside ApolloProvider and after auth is ready.
 */
export function useNotifications() {
    const apolloClient = useApolloClient();
    const router = useRouter();
    const { isAuthenticated, token: authToken } = useAuthStore();
    const currentPushToken = useRef<string | null>(null);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN);
    const [unregisterToken] = useMutation(UNREGISTER_DEVICE_TOKEN);
    const [trackPushTelemetry] = useMutation(TRACK_PUSH_TELEMETRY);

    const resolveDeviceId = () => {
        return Device.modelId || Device.osBuildId || Device.modelName || 'unknown';
    };

    useEffect(() => {
        if (!isAuthenticated || !authToken) return;

        let mounted = true;

        const sendTelemetry = async (
            eventType: 'RECEIVED' | 'OPENED' | 'ACTION_TAPPED' | 'TOKEN_REGISTERED' | 'TOKEN_REFRESHED' | 'TOKEN_UNREGISTERED',
            extra?: Record<string, unknown>,
        ) => {
            try {
                await trackPushTelemetry({
                    variables: {
                        input: {
                            appType: 'DRIVER',
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            eventType,
                            token: currentPushToken.current,
                            deviceId: resolveDeviceId(),
                            notificationTitle: typeof extra?.notificationTitle === 'string' ? extra.notificationTitle : undefined,
                            notificationBody: typeof extra?.notificationBody === 'string' ? extra.notificationBody : undefined,
                            campaignId: typeof extra?.campaignId === 'string' ? extra.campaignId : undefined,
                            orderId: typeof extra?.orderId === 'string' ? extra.orderId : undefined,
                            actionId: typeof extra?.actionId === 'string' ? extra.actionId : undefined,
                            metadata: extra,
                        },
                    },
                });
            } catch {
                // Telemetry is best-effort and must not block notification UX.
            }
        };

        async function setup() {
            try {
                // Request permission and get push token
                const pushToken = await registerForPushNotifications();
                if (!pushToken || !mounted) return;

                currentPushToken.current = pushToken;

                // Register with API
                const deviceId = resolveDeviceId();
                await registerToken({
                    variables: {
                        input: {
                            token: pushToken,
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            deviceId,
                            appType: 'DRIVER',
                        },
                    },
                });
                await sendTelemetry('TOKEN_REGISTERED', { tokenPreview: `${pushToken.slice(0, 20)}...` });

                console.log('[Notifications] Device token registered:', pushToken.substring(0, 20) + '...');
            } catch (error) {
                console.error('[Notifications] Setup failed:', error);
            }
        }

        setup();

        // Handle cold-start notification taps before listeners are attached.
        void Notifications.getLastNotificationResponseAsync().then((response) => {
            const data = response?.notification?.request?.content?.data;
            if (data) {
                void handleNotificationTap(data as Record<string, unknown>);
            }
        });

        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
            if (!mounted || newToken === currentPushToken.current) {
                return;
            }

            currentPushToken.current = newToken;

            try {
                await registerToken({
                    variables: {
                        input: {
                            token: newToken,
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            deviceId: resolveDeviceId(),
                            appType: 'DRIVER',
                        },
                    },
                });
                await sendTelemetry('TOKEN_REFRESHED', { tokenPreview: `${newToken.slice(0, 20)}...` });
            } catch (err) {
                console.error('[Notifications] Failed to register refreshed token:', err);
            }
        });

        // Listen for notifications received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('[Notifications] Received in foreground:', notification.request.content.title);
            void sendTelemetry('RECEIVED', {
                notificationTitle: notification.request.content.title,
                notificationBody: notification.request.content.body,
                campaignId: typeof notification.request.content.data?.campaignId === 'string' ? notification.request.content.data.campaignId : undefined,
                orderId: typeof notification.request.content.data?.orderId === 'string' ? notification.request.content.data.orderId : undefined,
            });
        });

        // Listen for notification taps (foreground + background)
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            const actionIdentifier = response.actionIdentifier;
            void sendTelemetry(
                actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ? 'ACTION_TAPPED' : 'OPENED',
                {
                    notificationTitle: response.notification.request.content.title,
                    notificationBody: response.notification.request.content.body,
                    campaignId: typeof data?.campaignId === 'string' ? data.campaignId : undefined,
                    orderId: typeof data?.orderId === 'string' ? data.orderId : undefined,
                    actionId: actionIdentifier,
                },
            );
            void handleNotificationTap(data as Record<string, unknown>);
        });

        return () => {
            mounted = false;
            unsubscribeTokenRefresh();
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [isAuthenticated, authToken]);

    // Clean up token on logout
    useEffect(() => {
        if (!isAuthenticated && currentPushToken.current) {
            void trackPushTelemetry({
                variables: {
                    input: {
                        appType: 'DRIVER',
                        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                        eventType: 'TOKEN_UNREGISTERED',
                        token: currentPushToken.current,
                        deviceId: resolveDeviceId(),
                    },
                },
            }).catch(() => null);

            unregisterToken({
                variables: { token: currentPushToken.current },
            }).catch((err) => console.warn('[Notifications] Failed to unregister token:', err));
            currentPushToken.current = null;
        }
    }, [isAuthenticated]);

    /**
     * Navigate to the appropriate screen when a notification is tapped.
     * Driver-specific: handles order assignment navigation.
     */
    async function handleNotificationTap(data: Record<string, unknown>) {
        if (!data) return;

        // Force a fresh order snapshot before navigating from a push-open path.
        try {
            await Promise.race([
                apolloClient.query({
                    query: GET_ORDERS,
                    fetchPolicy: 'network-only',
                }),
                new Promise((resolve) => setTimeout(resolve, 1500)),
            ]);
        } catch {
            // Keep navigation responsive even if refresh fails.
        }

        const type = data.type as string | undefined;
        const orderId = data.orderId as string | undefined;

        if (type === 'ORDER_ASSIGNED' && orderId) {
            // Navigate to the orders tab — driver can see the assigned order there
            router.push('/(tabs)' as never);
        } else if (data.screen) {
            router.push(`/${data.screen}` as never);
        }
    }
}

/**
 * Request notification permissions and get the native device push token (FCM/APNs).
 */
async function registerForPushNotifications(): Promise<string | null> {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.warn('[Notifications] Must use a physical device for push notifications');
        return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted');
        return null;
    }

    // Use Firebase Messaging token for parity across all apps.
    const token = await messaging().getToken();

    if (token.length < 100 || !token.includes(':')) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const retryToken = await messaging().getToken();
        if (retryToken.length < 100 || !retryToken.includes(':')) {
            return null;
        }
        return retryToken;
    }

    // Set up Android notification channels
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0ea5e9',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('orders', {
            name: 'New Orders',
            description: 'Notifications when new orders are assigned to you',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#22c55e',
            sound: 'default',
        });
    }

    return token;
}
