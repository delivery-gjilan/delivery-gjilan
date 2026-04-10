import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import messaging from '@react-native-firebase/messaging';

const bgHandlerGlobal = globalThis as { __driverBgMessageHandlerRegistered?: boolean };

if (!bgHandlerGlobal.__driverBgMessageHandlerRegistered) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        const data = remoteMessage?.data;
        console.log('[Notifications] Background FCM message', {
            orderId: data?.orderId,
            type: data?.type,
            status: data?.status,
        });
    });
    bgHandlerGlobal.__driverBgMessageHandlerRegistered = true;
}

export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
