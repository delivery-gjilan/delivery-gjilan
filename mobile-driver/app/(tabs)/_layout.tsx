import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationStore } from '@/store/navigationStore';
import { isValidCoordinatePair } from '@/utils/locationValidation';

function TabLabel({ label, focused, color, primaryColor }: { label: string; focused: boolean; color: string; primaryColor: string }) {
    const indicatorWidth = useSharedValue(focused ? 24 : 0);
    const indicatorStyle = useAnimatedStyle(() => ({ width: indicatorWidth.value }));
    useEffect(() => {
        indicatorWidth.value = withSpring(focused ? 24 : 0, { damping: 14, stiffness: 220 });
    }, [focused]);
    return (
        <View style={{ alignItems: 'center', marginTop: 2 }}>
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500', letterSpacing: 0.2 }}>
                {label}
            </Text>
            <Reanimated.View
                style={[indicatorStyle, { marginTop: 4, height: 3, borderRadius: 999, backgroundColor: focused ? primaryColor : 'transparent' }]}
            />
        </View>
    );
}

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
                    borderTopWidth: 1,
                    height: 58 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 8),
                },
                tabBarActiveTintColor: theme.colors.text,
                tabBarInactiveTintColor: theme.colors.subtext,
                tabBarItemStyle: { paddingVertical: 2 },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: t.tabs.orders,
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.orders} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="drive"
                options={{
                    title: t.tabs.map,
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.map} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="earnings"
                options={{
                    title: t.tabs.earnings,
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.earnings} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: t.tabs.orders ?? 'Orders',
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.orders ?? 'Orders'} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: t.tabs.messages,
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.messages} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t.tabs.profile,
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t.tabs.profile} focused={focused} color={color} primaryColor={theme.colors.primary} />,
                    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
