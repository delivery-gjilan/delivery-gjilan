import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { REGISTER_DEVICE_TOKEN, UNREGISTER_DEVICE_TOKEN } from '@/graphql/operations/notifications';
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

    console.log('[useNotifications] Hook called, isAuthenticated:', isAuthenticated);

    useEffect(() => {
        console.log('[useNotifications] Effect running, isAuthenticated:', isAuthenticated, 'hasAuthToken:', !!authToken);
        if (!isAuthenticated || !authToken) return;

        let mounted = true;

        async function setup() {
            try {
                // Request permission and get push token
                const pushToken = await registerForPushNotifications();
                if (!pushToken || !mounted) return;

                currentPushToken.current = pushToken;

                // Register with API
                const deviceId = Constants.installationId || Device.modelName || 'unknown';
                await registerToken({
                    variables: {
                        input: {
                            token: pushToken,
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            deviceId,
                            appType: 'CUSTOMER',
                        },
                    },
                });

                console.log('[Notifications] Device token registered:', pushToken.substring(0, 20) + '...');
            } catch (error) {
                console.error('[Notifications] Setup failed:', error);
            }
        }

        setup();

        // Listen for notifications received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('[Notifications] Received in foreground:', notification.request.content.title);
        });

        // Listen for notification taps (foreground + background)
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            handleNotificationTap(data);
        });

        return () => {
            mounted = false;
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
            unregisterToken({
                variables: { token: currentPushToken.current },
            }).catch((err) => console.warn('[Notifications] Failed to unregister token:', err));
            currentPushToken.current = null;
        }
    }, [isAuthenticated]);

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

    // Get the native device push token (FCM for Android, APNs for iOS)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    // Set up Android notification channel
    if (Platform.OS === 'android') {
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
    }

    return token as string;
}
