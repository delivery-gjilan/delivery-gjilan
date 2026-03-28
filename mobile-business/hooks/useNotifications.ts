import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import messaging, { firebase } from '@react-native-firebase/messaging';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { REGISTER_DEVICE_TOKEN, UNREGISTER_DEVICE_TOKEN, TRACK_PUSH_TELEMETRY } from '@/graphql/notifications';
import { useNotificationSettingsStore } from '@/store/useNotificationSettingsStore';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function resolveDeviceId(): string {
    return Constants.installationId || Constants.sessionId || 'unknown';
}

async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) return null;

    // Safety check: Don't call messaging() if native Firebase app isn't ready
    if (!firebase.apps.length) {
        console.warn('[BusinessNotifications] Firebase not initialized natively');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return null;
    }

    const token = await messaging().getToken();

    if (token.length < 100 || !token.includes(':')) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const retryToken = await messaging().getToken();
        if (retryToken.length < 100 || !retryToken.includes(':')) {
            return null;
        }
        return retryToken;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0b89a9',
            sound: 'default',
        });
    }

    return token;
}

export function useNotifications() {
    const { isAuthenticated, token: authToken } = useAuthStore();
    const pushEnabled = useNotificationSettingsStore((state) => state.pushEnabled);
    const currentPushToken = useRef<string | null>(null);

    const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN);
    const [unregisterToken] = useMutation(UNREGISTER_DEVICE_TOKEN);
    const [trackPushTelemetry] = useMutation(TRACK_PUSH_TELEMETRY);

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
                            appType: 'BUSINESS',
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
                if (!pushEnabled) {
                    if (currentPushToken.current) {
                        await unregisterToken({ variables: { token: currentPushToken.current } }).catch(() => null);
                        await sendTelemetry('TOKEN_UNREGISTERED').catch(() => null);
                        currentPushToken.current = null;
                    }
                    return;
                }

                const pushToken = await registerForPushNotifications();
                if (!pushToken || !mounted) return;

                currentPushToken.current = pushToken;

                await registerToken({
                    variables: {
                        input: {
                            token: pushToken,
                            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                            deviceId: resolveDeviceId(),
                            appType: 'BUSINESS',
                        },
                    },
                });
                await sendTelemetry('TOKEN_REGISTERED', { tokenPreview: `${pushToken.slice(0, 20)}...` });
            } catch (error) {
                console.error('[BusinessNotifications] Setup failed:', error);
            }
        }

        setup();

        let unsubscribeTokenRefresh: (() => void) | undefined;
        
        if (firebase.apps.length && pushEnabled) {
            unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
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
                                appType: 'BUSINESS',
                            },
                        },
                    });
                    await sendTelemetry('TOKEN_REFRESHED', { tokenPreview: `${newToken.slice(0, 20)}...` });
                } catch (err) {
                    console.error('[BusinessNotifications] Failed to register refreshed token:', err);
                }
            });
        }

        const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            void sendTelemetry('RECEIVED', {
                notificationTitle: notification.request.content.title,
                notificationBody: notification.request.content.body,
                campaignId: typeof notification.request.content.data?.campaignId === 'string' ? notification.request.content.data.campaignId : undefined,
                orderId: typeof notification.request.content.data?.orderId === 'string' ? notification.request.content.data.orderId : undefined,
            });
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
            const actionIdentifier = response.actionIdentifier;
            const data = response.notification.request.content.data;
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
        });

        return () => {
            mounted = false;
            unsubscribeTokenRefresh?.();
            notificationListener.remove();
            responseListener.remove();
        };
    }, [isAuthenticated, authToken, pushEnabled, registerToken, unregisterToken, trackPushTelemetry]);

    useEffect(() => {
        if (!isAuthenticated && currentPushToken.current) {
            void trackPushTelemetry({
                variables: {
                    input: {
                        appType: 'BUSINESS',
                        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                        eventType: 'TOKEN_UNREGISTERED',
                        token: currentPushToken.current,
                        deviceId: resolveDeviceId(),
                    },
                },
            }).catch(() => null);

            unregisterToken({ variables: { token: currentPushToken.current } }).catch(() => null);
            currentPushToken.current = null;
        }
    }, [isAuthenticated, unregisterToken]);
}
