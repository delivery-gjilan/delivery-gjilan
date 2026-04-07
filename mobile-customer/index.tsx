import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';

const bgHandlerGlobal = globalThis as { __customerBgMessageHandlerRegistered?: boolean };

if (!bgHandlerGlobal.__customerBgMessageHandlerRegistered) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        const data = remoteMessage?.data;
        const orderId = data?.orderId;
        const type = data?.type;
        const status = data?.status;
        console.log('[Notifications] Background FCM message', { orderId, type, status });

        // Bridge Live Activity ETA data into Zustand so useBackgroundLiveActivity
        // has fresh data when the app wakes from suspension.
        if (orderId && data?.remainingEtaSeconds) {
            try {
                useActiveOrdersStore.getState().patchDriverConnection(String(orderId), {
                    activeOrderId: String(orderId),
                    navigationPhase: data.navigationPhase ? String(data.navigationPhase) : null,
                    remainingEtaSeconds: Number(data.remainingEtaSeconds) || null,
                    etaUpdatedAt: data.etaUpdatedAt ? String(data.etaUpdatedAt) : new Date().toISOString(),
                });
            } catch (e) {
                console.warn('[Notifications] Failed to patch store from background message', e);
            }
        }
    });
    bgHandlerGlobal.__customerBgMessageHandlerRegistered = true;
}

// Must be exported or Fast Refresh won't update the context
export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
