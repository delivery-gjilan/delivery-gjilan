import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';
import { initSentry, Sentry } from '@/lib/sentry';

// ── Initialise Sentry before anything else renders ──
initSentry();

function AppContent() {
    // Start heartbeat as soon as auth is established
    useDriverTracking();

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
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

export default Sentry.wrap(RootLayout);
