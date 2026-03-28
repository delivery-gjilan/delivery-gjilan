import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { useNotifications } from '@/hooks/useNotifications';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useDriverPttReceiver } from '@/hooks/useDriverPttReceiver';
import InfoBanner from '@/components/InfoBanner';
import type { InfoBannerType } from '@/components/InfoBanner';
import DriverMessageBanner from '@/components/DriverMessageBanner';
import type { AlertType } from '@/components/DriverMessageBanner';
import { useSubscription } from '@apollo/client/react';
import { DRIVER_MESSAGE_RECEIVED_SUB } from '@/graphql/operations/driverMessages';
import { useGlobalOrderAccept } from '@/hooks/useGlobalOrderAccept';
import { OrderAcceptSheet } from '@/components/OrderAcceptSheet';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';

function AppContent() {
    // Start heartbeat as soon as auth is established
    useDriverTracking();
    useNotifications();
    const { isAdminTalking } = useDriverPttReceiver();
    const { pendingOrder, autoCountdown, accepting, handleAcceptOrder, handleSkipOrder, handleAcceptAndNavigate } =
        useGlobalOrderAccept();

    const { bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const showBanner = bannerEnabled && !!bannerMessage && !bannerDismissed;

    interface IncomingMessage {
        id: string;
        senderRole: string;
        body: string;
        alertType: AlertType;
        adminId: string;
    }
    const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);

    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived as IncomingMessage | undefined;
            if (!msg || msg.senderRole !== 'ADMIN') return;
            setIncomingMessage(msg);
        },
    });

    return (
        <>
            {isAdminTalking && (
                <View className="absolute top-12 left-4 right-4 z-50 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 flex-row items-center gap-3">
                    <ActivityIndicator color="#fca5a5" size="small" />
                    <Text className="text-red-200 text-sm font-semibold">
                        Admin is talking
                    </Text>
                </View>
            )}
            {showBanner && (
                <InfoBanner
                    message={bannerMessage}
                    type={(bannerType as InfoBannerType) ?? 'INFO'}
                    onDismiss={() => setBannerDismissed(true)}
                />
            )}
            {incomingMessage && (
                <DriverMessageBanner
                    key={incomingMessage.id}
                    senderName="Dispatcher"
                    body={incomingMessage.body}
                    alertType={incomingMessage.alertType}
                    adminId={incomingMessage.adminId}
                    onDismiss={() => setIncomingMessage(null)}
                />
            )}
            {pendingOrder && (
                <OrderAcceptSheet
                    order={pendingOrder}
                    onAccept={handleAcceptOrder}
                    onAcceptAndNavigate={handleAcceptAndNavigate}
                    onSkip={handleSkipOrder}
                    accepting={accepting}
                    autoCountdown={autoCountdown}
                />
            )}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="navigation"
                    options={{
                        presentation: 'fullScreenModal',
                        headerShown: false,
                        gestureEnabled: false,
                        animation: 'fade',
                    }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();

    useEffect(() => {
        if (MAPBOX_TOKEN) {
            Mapbox.setAccessToken(MAPBOX_TOKEN);
        }
    }, []);

    if (!ready) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" className="text-blue-600" />
            </View>
        );
    }

    return (
        <Providers>
            <AppContent />
        </Providers>
    );
}
