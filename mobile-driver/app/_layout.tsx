import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { useNotifications } from '@/hooks/useNotifications';
import { GlobalOrderAcceptProvider } from '@/hooks/GlobalOrderAcceptContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';
import { AppOverlays } from '@/components/AppOverlays';

function AppContent() {
    // Start heartbeat as soon as auth is established
    useDriverTracking();
    useNotifications();
    useNetworkStatus();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        useAuthStore.getState().setAppSessionActive(true);
        return () => {
            useAuthStore.getState().setAppSessionActive(false);
        };
    }, []);

    return (
        <>
            <AppOverlays />
            <Stack
                initialRouteName={isAuthenticated ? 'brand-splash' : 'login'}
                screenOptions={{ headerShown: false, animation: 'none' }}
            >
                <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="brand-splash" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
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
    const hasHydrated = useAuthStore((s) => s.hasHydrated);

    useEffect(() => {
        if (MAPBOX_TOKEN) {
            Mapbox.setAccessToken(MAPBOX_TOKEN);
        }
    }, []);

    if (!ready || !hasHydrated) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" className="text-blue-600" />
            </View>
        );
    }

    return (
        <Providers>
            <GlobalOrderAcceptProvider>
                <AppContent />
            </GlobalOrderAcceptProvider>
        </Providers>
    );
}
