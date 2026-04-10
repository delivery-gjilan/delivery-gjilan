import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import messaging from '@react-native-firebase/messaging';

const bgHandlerGlobal = globalThis as { __businessBgMessageHandlerRegistered?: boolean };

if (!bgHandlerGlobal.__businessBgMessageHandlerRegistered) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        const data = remoteMessage?.data;
        console.log('[BusinessNotifications] Background FCM message', {
            type: data?.type,
            orderId: data?.orderId,
            status: data?.status,
        });
    });
    bgHandlerGlobal.__businessBgMessageHandlerRegistered = true;
}

export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
