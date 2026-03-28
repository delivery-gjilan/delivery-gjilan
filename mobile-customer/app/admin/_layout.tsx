import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';

export default function AdminLayout() {
    const router = useRouter();
    const theme = useTheme();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            router.replace('/(tabs)/profile');
        }
    }, [user, router]);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
        return null;
    }

    const headerStyle = { backgroundColor: theme.colors.background };
    const headerTintColor = theme.colors.text;

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerStyle,
                headerTintColor,
                headerShadowVisible: false,
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="order/[orderId]"
                options={{
                    headerShown: true,
                    title: 'Order Detail',
                    headerStyle,
                    headerTintColor,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <Stack.Screen
                name="drivers"
                options={{ headerShown: true, title: 'Drivers', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="driver/[driverId]"
                options={{ headerShown: true, title: 'Driver Details', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="businesses"
                options={{ headerShown: true, title: 'Businesses', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="business/[businessId]"
                options={{ headerShown: true, title: 'Business Details', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="users"
                options={{ headerShown: true, title: 'Users', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="settlements"
                options={{ headerShown: true, title: 'Settlements', headerStyle, headerTintColor }}
            />
            <Stack.Screen
                name="notifications"
                options={{ headerShown: true, title: 'Notifications', headerStyle, headerTintColor }}
            />
        </Stack>
    );
}
