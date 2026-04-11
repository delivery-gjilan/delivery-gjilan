import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useNotifications } from '@/hooks/useNotifications';
import { useOperationalOrderAlerts } from '@/hooks/useOperationalOrderAlerts';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';

function AppContent() {
    useNotifications();
    useOperationalOrderAlerts();

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="order/[orderId]"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    gestureDirection: 'vertical',
                    gestureEnabled: true,
                    headerShown: false,
                }}
            />
            <Stack.Screen name="ops-notifications" options={{ headerShown: false }} />
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
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Providers>
            <AppContent />
        </Providers>
    );
}
