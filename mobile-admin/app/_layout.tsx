import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { ActivityIndicator, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useNotifications } from '@/hooks/useNotifications';

function AppContent() {
    useNotifications();

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
            <Stack.Screen
                name="driver/[driverId]"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    gestureDirection: 'vertical',
                    gestureEnabled: true,
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="business/[businessId]"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    gestureDirection: 'vertical',
                    gestureEnabled: true,
                    headerShown: false,
                }}
            />
            <Stack.Screen name="businesses" options={{ headerShown: false }} />
            <Stack.Screen name="drivers" options={{ headerShown: false }} />
            <Stack.Screen name="users" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="settlements" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();

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
