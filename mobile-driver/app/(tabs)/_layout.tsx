import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useNavigationStore } from '@/store/navigationStore';

export default function TabLayout() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const { logout } = useAuth();
    const isNavigating = useNavigationStore((s) => s.isNavigating);

    // If the driver had an active navigation session before the app was killed,
    // restore them to the navigation screen immediately on mount.
    useEffect(() => {
        if (isNavigating) {
            router.replace('/navigation' as any);
        }
    // Only run on mount — we don't want to force-redirect every time isNavigating changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    title: t.tabs.home,
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
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
