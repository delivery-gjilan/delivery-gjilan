import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { useNavigationStore } from '@/store/navigationStore';
import { isValidCoordinatePair } from '@/utils/locationValidation';

export default function TabLayout() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const { logout } = useAuth();
    const isNavigating = useNavigationStore((s) => s.isNavigating);
    const isNavigationMinimized = useNavigationStore((s) => s.isNavigationMinimized);
    const navOrder = useNavigationStore((s) => s.order);
    const destination = useNavigationStore((s) => s.destination);
    const stopNavigation = useNavigationStore((s) => s.stopNavigation);
    const [navHydrated, setNavHydrated] = useState(() => useNavigationStore.persist.hasHydrated());

    useEffect(() => {
        if (useNavigationStore.persist.hasHydrated()) {
            setNavHydrated(true);
            return;
        }
        const unsubscribe = useNavigationStore.persist.onFinishHydration(() => {
            setNavHydrated(true);
        });
        return unsubscribe;
    }, []);

    // Session restore: if the driver had an active navigation session before the
    // app was killed, send them back to the navigation screen on mount.
    // IMPORTANT: use a ref guard so this only fires once at mount, never when
    // isNavigating changes at runtime (e.g. after Accept & Navigate) — otherwise
    // it would double-navigate and cause a crash.
    const hasRestoredNavigationRef = useRef(false);
    useEffect(() => {
        if (!navHydrated) return;
        if (hasRestoredNavigationRef.current) return;
        hasRestoredNavigationRef.current = true;

        if (!isNavigating || !navOrder) {
            return;
        }

        if (
            destination &&
            !isValidCoordinatePair(destination.latitude, destination.longitude)
        ) {
            stopNavigation();
            return;
        }

        const isDirectCallSession = navOrder?.channel === 'DIRECT_DISPATCH';
        const isOutForDelivery = navOrder?.status === 'OUT_FOR_DELIVERY';
        const canResumeOutForDelivery = !isOutForDelivery || (navOrder?.channel === 'PLATFORM' && !!navOrder?.dropoff);
        if (isDirectCallSession || !canResumeOutForDelivery) {
            stopNavigation();
            return;
        }

        if (!isNavigationMinimized) {
            router.replace('/navigation' as any);
        }
    }, [destination, isNavigating, isNavigationMinimized, navHydrated, navOrder, router, stopNavigation]);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch (err) {
            console.error('[Logout] Failed:', err);
        }
    };


    return (
        <Tabs
            initialRouteName="drive"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                    height: 54 + insets.bottom,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.subtext,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: t.tabs.orders,
                    tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="drive"
                options={{
                    title: t.tabs.map,
                    tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="earnings"
                options={{
                    title: t.tabs.earnings,
                    tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="orders"
                options={{
                    title: t.tabs.orders ?? 'Orders',
                    tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="messages"
                options={{
                    title: t.tabs.messages,
                    tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: t.tabs.profile,
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
