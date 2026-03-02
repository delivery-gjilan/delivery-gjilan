import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { useNotifications } from '@/hooks/useNotifications';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import InfoBanner from '@/components/InfoBanner';
import type { InfoBannerType } from '@/components/InfoBanner';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';
import { initSentry } from '@/lib/sentry';

// ── Initialise Sentry before anything else renders ──
initSentry();

function AppContent() {
    // Start heartbeat as soon as auth is established
    useDriverTracking();
    useNotifications();

    const { bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const showBanner = bannerEnabled && !!bannerMessage && !bannerDismissed;

    return (
        <>
            {showBanner && (
                <InfoBanner
                    message={bannerMessage}
                    type={(bannerType as InfoBannerType) ?? 'INFO'}
                    onDismiss={() => setBannerDismissed(true)}
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
