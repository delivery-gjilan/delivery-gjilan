import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { REGISTER_DEVICE_TOKEN, UNREGISTER_DEVICE_TOKEN, TRACK_PUSH_TELEMETRY } from '@/graphql/operations/notifications';
import { useRouter } from 'expo-router';

function isLikelyRawApnsToken(token: string): boolean {
    // APNs device tokens are typically 64-byte hex strings represented as 64 hex chars.
    // FCM registration tokens are opaque and should not be parsed for delimiters.
    return /^[a-fA-F0-9]{64}$/.test(token);
}

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

// ── Setup interactive notification categories ───────────────────────
/**
 * Configure notification categories with interactive action buttons.
 * These buttons appear when user long-presses or swipes down on notifications.
 */
async function setupNotificationCategories() {
    try {
        // Category: Order on the way - Track Order button
        await Notifications.setNotificationCategoryAsync('order-on-the-way', [
            {
                identifier: 'TRACK_ORDER',
                buttonTitle: '📍 Track Order',
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);

        // Category: Order delivered - Rate, Add Tip, and Support buttons
        await Notifications.setNotificationCategoryAsync('order-delivered', [
            {
                identifier: 'RATE_ORDER',
                buttonTitle: '⭐ Rate Order',
                options: {
                    opensAppToForeground: true,
                },
            },
            {
                identifier: 'ADD_TIP',
                buttonTitle: '💵 Add Tip',
                options: {
                    opensAppToForeground: true,
                },
            },
            {
                identifier: 'CONTACT_SUPPORT',
                buttonTitle: '💬 Support',
                options: {
                    opensAppToForeground: false, // Can handle in background
                },
            },
        ]);

        // Category: Order cancelled - Contact Support button
        await Notifications.setNotificationCategoryAsync('order-cancelled', [
            {
                identifier: 'CONTACT_SUPPORT',
                buttonTitle: '💬 Contact Support',
                options: {
                    opensAppToForeground: true,
                },
            },
            {
                identifier: 'VIEW_REFUND',
                buttonTitle: '💰 View Refund',
                options: {
                    opensAppToForeground: true,
                },
            },
        ]);

        console.log('[Notifications] Interactive categories configured');
    } catch (error) {
        console.error('[Notifications] Failed to setup categories:', error);
    }
}

/**
 * Hook that manages push notification lifecycle:
 * - Requests permission
 * - Gets FCM/APNs device token
 * - Registers token with API
 * - Handles foreground + background notification tap navigation
 * - Cleans up on logout
 *
 * Must be called inside ApolloProvider and after auth is ready.
 */
export function useNotifications() {
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

    console.log('[useNotifications] Hook initialized');

    useEffect(() => {
        console.log('[useNotifications] Auth effect running:', { 
            isAuthenticated, 
            hasAuthToken: !!authToken,
            platform: Platform.OS 
        });
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
                            appType: 'CUSTOMER',
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
                // Best-effort telemetry.
            }
        };

        async function setup() {
            try {
                console.log('[Notifications] Starting setup process...');
                
                // Setup interactive notification categories
                await setupNotificationCategories();
                
                // Request permission and get push token
                const pushToken = await registerForPushNotifications();
                if (!pushToken || !mounted) {
                    console.log('[Notifications] No push token or component unmounted, aborting setup');
                    return;
                }

                currentPushToken.current = pushToken;

                // Register with API
                const deviceId = resolveDeviceId();
                console.log('[Notifications] Registering token with backend...', {
                    deviceId,
                    platform: Platform.OS,
                    tokenPreview: pushToken.substring(0, 20) + '...'
                });
                
                const result = await registerToken({
                    variables: {
                        input: {
                            token: pushToken,
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            deviceId,
                            appType: 'CUSTOMER',
                        },
                    },
                });

                console.log('[Notifications] Backend registration result:', result.data);
                console.log('[Notifications] Device token registered successfully');
                await sendTelemetry('TOKEN_REGISTERED', { tokenPreview: `${pushToken.slice(0, 20)}...` });
            } catch (error) {
                console.error('[Notifications] Setup failed:', error);
                if (error instanceof Error) {
                    console.error('[Notifications] Error details:', {
                        message: error.message,
                        stack: error.stack,
                    });
                }
            }
        }

        setup();

        // Listen for FCM token refresh — re-register with backend when Firebase issues a new token
        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
            console.log('[Notifications] FCM token refreshed, re-registering...', {
                tokenPreview: newToken.substring(0, 20) + '...',
                tokenLength: newToken.length,
            });

            if (!newToken || isLikelyRawApnsToken(newToken)) {
                console.warn('[Notifications] Token refresh returned APNs-like token, ignoring:', {
                    length: newToken.length,
                });
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
                            appType: 'CUSTOMER',
                        },
                    },
                });
                console.log('[Notifications] Refreshed token registered successfully');
                await sendTelemetry('TOKEN_REFRESHED', { tokenPreview: `${newToken.slice(0, 20)}...` });
            } catch (err) {
                console.error('[Notifications] Failed to register refreshed token:', err);
            }
        });

        // Listen for notifications received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body } = notification.request.content;
            console.log('[Notifications] Received in foreground:', title);
            
            // Show in-app toast for better UX
            if (title) {
                toast.info(title, body || '');
            }

            void sendTelemetry('RECEIVED', {
                notificationTitle: title,
                notificationBody: body,
                campaignId: typeof notification.request.content.data?.campaignId === 'string' ? notification.request.content.data.campaignId : undefined,
                orderId: typeof notification.request.content.data?.orderId === 'string' ? notification.request.content.data.orderId : undefined,
            });
        });

        // Listen for notification taps (foreground + background)
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            const actionIdentifier = response.actionIdentifier;
            
            console.log('[Notifications] Notification response:', { actionIdentifier, data });
            
            // Handle interactive action buttons
            if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
                void sendTelemetry('ACTION_TAPPED', {
                    notificationTitle: response.notification.request.content.title,
                    notificationBody: response.notification.request.content.body,
                    campaignId: typeof data?.campaignId === 'string' ? data.campaignId : undefined,
                    orderId: typeof data?.orderId === 'string' ? data.orderId : undefined,
                    actionId: actionIdentifier,
                });
                handleNotificationAction(actionIdentifier, data);
            } else {
                // Default tap - navigate to screen
                void sendTelemetry('OPENED', {
                    notificationTitle: response.notification.request.content.title,
                    notificationBody: response.notification.request.content.body,
                    campaignId: typeof data?.campaignId === 'string' ? data.campaignId : undefined,
                    orderId: typeof data?.orderId === 'string' ? data.orderId : undefined,
                });
                handleNotificationTap(data);
            }
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
                        appType: 'CUSTOMER',
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
     * Handle interactive notification action buttons.
     */
    function handleNotificationAction(actionId: string, data: Record<string, unknown>) {
        const orderId = data.orderId as string | undefined;
        
        console.log('[Notifications] Handling action:', actionId, 'for order:', orderId);
        
        switch (actionId) {
            case 'TRACK_ORDER':
                if (orderId) {
                    router.push(`/orders/${orderId}` as never);
                }
                break;
                
            case 'RATE_ORDER':
                if (orderId) {
                    // TODO: Navigate to rating screen or show rating modal
                    router.push(`/orders/${orderId}` as never);
                    toast.info('Rate Order', 'Please rate your order');
                }
                break;
                
            case 'ADD_TIP':
                if (orderId) {
                    // TODO: Navigate to tip screen or show tip modal
                    router.push(`/orders/${orderId}` as never);
                    toast.info('Add Tip', 'Add a tip for your driver');
                }
                break;
                
            case 'CONTACT_SUPPORT':
                // TODO: Navigate to support chat or show contact options
                router.push('/support' as never);
                break;
                
            case 'VIEW_REFUND':
                if (orderId) {
                    router.push(`/orders/${orderId}` as never);
                }
                break;
                
            default:
                console.warn('[Notifications] Unknown action:', actionId);
        }
    }

    /**
     * Navigate to the appropriate screen when a notification is tapped.
     */
    function handleNotificationTap(data: Record<string, unknown>) {
        if (!data) return;

        const screen = data.screen as string | undefined;
        const orderId = data.orderId as string | undefined;

        if (screen === 'orders/active' && orderId) {
            router.push(`/orders/${orderId}` as never);
        } else if (screen) {
            router.push(`/${screen}` as never);
        }
    }
}

/**
 * Request notification permissions and get the FCM registration token.
 * Uses @react-native-firebase/messaging to get a proper FCM token on both iOS and Android.
 * Firebase Admin SDK requires FCM tokens — NOT raw APNs tokens.
 */
async function registerForPushNotifications(): Promise<string | null> {
    console.log('[Notifications] Starting registration...');
    
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.warn('[Notifications] Must use a physical device for push notifications');
        return null;
    }

    console.log('[Notifications] Device check passed, requesting permissions...');

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    console.log('[Notifications] Existing permission status:', existingStatus);

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[Notifications] Permission requested, new status:', status);
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted, final status:', finalStatus);
        return null;
    }

    console.log('[Notifications] Permissions granted, getting FCM registration token...');

    // Ensure iOS device is registered with APNs before requesting FCM token.
    if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
    }

    // Use Firebase Messaging to get the FCM registration token.
    // On iOS, @react-native-firebase handles the APNs→FCM exchange automatically.
    // This is required — Notifications.getDevicePushTokenAsync() returns a raw APNs
    // token on iOS which the Firebase Admin SDK cannot send to directly.
    const token = await messaging().getToken();

    console.log('[Notifications] FCM token obtained:', token, 'length:', token.length);

    if (!token || isLikelyRawApnsToken(token)) {
        console.error('[Notifications] Got APNs-like token, retrying after delay...');
        // Wait for the APNs→FCM exchange to complete and retry
        await new Promise(resolve => setTimeout(resolve, 3000));
        const retryToken = await messaging().getToken();
        console.log('[Notifications] Retry FCM token:', retryToken, 'length:', retryToken.length);
        if (!retryToken || isLikelyRawApnsToken(retryToken)) {
            console.error('[Notifications] Still got APNs-like token after retry, cannot register');
            return null;
        }
        return retryToken;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
        console.log('[Notifications] Setting up Android notification channels...');
        
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0ea5e9',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Order Updates',
            description: 'Notifications about your order status',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0ea5e9',
            sound: 'default',
        });
        
        console.log('[Notifications] Android channels configured successfully');
    }

    console.log('[Notifications] Registration complete, returning token');
    return token;
}
