import { View, Text, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { REGISTER_DEVICE_TOKEN } from '@/graphql/operations/notifications';
import { useRouter } from 'expo-router';

const GET_MY_DEVICE_TOKENS = gql`
  query GetMyDeviceTokens {
    me {
      id
      email
      firstName
      lastName
    }
    deviceTokens {
      token
      platform
      deviceId
      appType
      updatedAt
    }
  }
`;

interface DeviceToken {
    token: string;
    platform: string;
    deviceId: string;
    appType: string;
    updatedAt: string;
}

interface MeData {
    me: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
    deviceTokens: DeviceToken[];
}

export default function DebugNotificationsScreen() {
    const router = useRouter();
    const { isAuthenticated, token: authToken, user } = useAuthStore();
    const [permissionStatus, setPermissionStatus] = useState<string>('checking...');
    const [deviceToken, setDeviceToken] = useState<string>('Not obtained yet');
    const [registrationStatus, setRegistrationStatus] = useState<string>('Not attempted');
    const [lastError, setLastError] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);

    const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN);
    const { data } = useQuery<MeData>(GET_MY_DEVICE_TOKENS, { skip: !isAuthenticated });

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
    };

    const resolveDeviceId = () => {
        return (
            Device.modelId ||
            Device.osBuildId ||
            Device.modelName ||
            'unknown'
        );
    };

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        try {
            addLog('Checking notification permissions...');
            const { status } = await Notifications.getPermissionsAsync();
            setPermissionStatus(status);
            addLog(`Permission status: ${status}`);
        } catch (error) {
            const err = error as Error;
            setLastError(err.message);
            addLog(`Error checking permissions: ${err.message}`);
        }
    };

    const requestPermissions = async () => {
        try {
            addLog('Requesting notification permissions...');
            const { status } = await Notifications.requestPermissionsAsync();
            setPermissionStatus(status);
            addLog(`Permission granted: ${status}`);
            
            if (status === 'granted') {
                Alert.alert('Success', 'Notifications permission granted!');
            } else {
                Alert.alert('Denied', 'Notifications permission was denied');
            }
        } catch (error) {
            const err = error as Error;
            setLastError(err.message);
            addLog(`Error requesting permissions: ${err.message}`);
        }
    };

    const getDeviceToken = async () => {
        try {
            addLog('Getting FCM token via Firebase Messaging...');
            
            if (!Device.isDevice) {
                throw new Error('Must use physical device for push notifications');
            }

            // Get FCM token using Firebase Messaging SDK
            const token = await messaging().getToken();
            setDeviceToken(token);
            addLog(`FCM token: ${token}`);
        } catch (error) {
            const err = error as Error;
            setLastError(err.message);
            addLog(`Error getting token: ${err.message}`);
        }
    };

    const registerWithBackend = async () => {
        try {
            if (!isAuthenticated) {
                throw new Error('Not authenticated! Please log in first.');
            }

            if (deviceToken === 'Not obtained yet') {
                throw new Error('Get device token first!');
            }

            addLog('Registering token with backend...');
            setRegistrationStatus('Registering...');

            const deviceId = resolveDeviceId();
            
            const result = await registerToken({
                variables: {
                    input: {
                        token: deviceToken,
                        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                        deviceId,
                        appType: 'CUSTOMER',
                    },
                },
            });

            setRegistrationStatus('✅ Registered successfully!');
            addLog('Backend registration successful!');
            Alert.alert('Success!', 'Your device is now registered for push notifications');
        } catch (error) {
            const err = error as Error;
            setLastError(err.message);
            setRegistrationStatus(`❌ Failed: ${err.message}`);
            addLog(`Registration error: ${err.message}`);
        }
    };

    const sendTestFirebasePush = async () => {
        try {
            if (!authToken) {
                throw new Error('Not authenticated');
            }
            addLog('Calling /api/debug/test-push on server...');
            const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? '').replace('/graphql', '');
            const resp = await fetch(`${apiBase}/api/debug/test-push`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const json = await resp.json();
            addLog(`Result: ${json.message}`);
            addLog(`Success: ${json.successCount ?? 0}, Failures: ${json.failureCount ?? 0}`);
            if (json.staleTokens?.length > 0) {
                addLog(`⚠️ Stale tokens removed: ${json.staleTokens.length}`);
            }
            if (json.error) {
                setLastError(json.error);
                addLog(`Firebase error: ${json.error}`);
            }
        } catch (error) {
            const err = error as Error;
            setLastError(err.message);
            addLog(`Firebase push error: ${err.message}`);
        }
    };

    const sendTestNotification = async () => {
        try {
            addLog('Sending test local notification...');
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Test Notification 📬",
                    body: "If you see this, notifications are working!",
                    data: { test: true },
                },
                trigger: null, // Send immediately
            });
            addLog('Test notification sent!');
        } catch (error) {
            const err = error as Error;
            addLog(`Test notification error: ${err.message}`);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white dark:bg-zinc-900">
            <View className="p-4">
                <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                        🐛 Notification Debug
                    </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-blue-500 text-lg">Close</Text>
                    </TouchableOpacity>
                </View>

                {/* System Info */}
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                    <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        📱 System Info
                    </Text>
                    <InfoRow label="Platform" value={Platform.OS} />
                    <InfoRow label="Is Physical Device" value={Device.isDevice ? 'Yes' : 'No'} />
                    <InfoRow label="Device Model" value={Device.modelName || 'Unknown'} />
                </View>

                {/* Auth Info */}
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                    <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        🔐 Auth Status
                    </Text>
                    <InfoRow label="Authenticated" value={isAuthenticated ? '✅ Yes' : '❌ No'} />
                    <InfoRow label="Has Token" value={authToken ? '✅ Yes' : '❌ No'} />
                    <InfoRow label="User Email" value={user?.email || data?.me?.email || 'Not logged in'} />
                </View>

                {/* Notification Status */}
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                    <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        🔔 Notification Status
                    </Text>
                    <InfoRow label="Permission" value={permissionStatus} />
                    <InfoRow label="Device Token" value={deviceToken.substring(0, 50) + (deviceToken.length > 50 ? '...' : '')} />
                    <InfoRow label="Registration" value={registrationStatus} />
                </View>

                {/* Backend Device Tokens */}
                {data?.deviceTokens && data.deviceTokens.length > 0 && (
                    <View className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-4">
                        <Text className="text-lg font-semibold text-emerald-900 dark:text-emerald-400 mb-2">
                            ✅ Backend Registered Tokens ({data.deviceTokens.length})
                        </Text>
                        {data.deviceTokens.map((token, idx) => (
                            <View key={idx} className="mb-3 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                                <InfoRow label="Platform" value={token.platform} />
                                <InfoRow label="App Type" value={token.appType} />
                                <InfoRow label="Device ID" value={token.deviceId} />
                                <InfoRow 
                                    label="Token Match" 
                                    value={token.token === deviceToken ? '✅ MATCHES' : '⚠️ DIFFERENT'} 
                                />
                                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Last updated: {new Date(token.updatedAt).toLocaleString()}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                
                {data?.deviceTokens && data.deviceTokens.length === 0 && (
                    <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
                        <Text className="text-lg font-semibold text-yellow-900 dark:text-yellow-400 mb-2">
                            ⚠️ No Backend Tokens Found
                        </Text>
                        <Text className="text-yellow-800 dark:text-yellow-300">
                            Your device token is not registered on the backend. Order status notifications won't work! 
                            Click "4️⃣ Register with Backend" above.
                        </Text>
                    </View>
                )}

                {/* Error Display */}
                {lastError && (
                    <View className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 mb-4">
                        <Text className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
                            ❌ Last Error
                        </Text>
                        <Text className="text-red-800 dark:text-red-300">{lastError}</Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View className="space-y-3 mb-4">
                    <ActionButton onPress={checkPermissions} title="1️⃣ Check Permissions" />
                    <ActionButton onPress={requestPermissions} title="2️⃣ Request Permissions" />
                    <ActionButton onPress={getDeviceToken} title="3️⃣ Get Device Token" />
                    <ActionButton onPress={registerWithBackend} title="4️⃣ Register with Backend" disabled={!isAuthenticated} />
                    <ActionButton onPress={sendTestFirebasePush} title="🔥 Send Test Firebase Push" disabled={!isAuthenticated} />
                    <ActionButton onPress={sendTestNotification} title="📬 Send Test Local Notification" />
                </View>

                {/* Logs */}
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        📋 Activity Log
                    </Text>
                    {logs.length === 0 ? (
                        <Text className="text-zinc-500 dark:text-zinc-400">No activity yet</Text>
                    ) : (
                        logs.map((log, i) => (
                            <Text key={i} className="text-xs text-zinc-700 dark:text-zinc-300 mb-1 font-mono">
                                {log}
                            </Text>
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row justify-between py-1">
            <Text className="text-zinc-600 dark:text-zinc-400">{label}:</Text>
            <Text className="text-zinc-900 dark:text-white font-medium">{value}</Text>
        </View>
    );
}

function ActionButton({ onPress, title, disabled }: { onPress: () => void; title: string; disabled?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            className={`bg-blue-500 rounded-lg p-4 ${disabled ? 'opacity-50' : ''}`}
        >
            <Text className="text-white text-center font-semibold">{title}</Text>
        </TouchableOpacity>
    );
}
