import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import messaging from '@react-native-firebase/messaging';

const bgHandlerGlobal = globalThis as { __customerBgMessageHandlerRegistered?: boolean };

if (!bgHandlerGlobal.__customerBgMessageHandlerRegistered) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        const orderId = remoteMessage?.data?.orderId;
        const type = remoteMessage?.data?.type;
        const status = remoteMessage?.data?.status;
        console.log('[Notifications] Background FCM message', { orderId, type, status });
    });
    bgHandlerGlobal.__customerBgMessageHandlerRegistered = true;
}

// Must be exported or Fast Refresh won't update the context
export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
