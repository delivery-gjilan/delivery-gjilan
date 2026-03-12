import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/hooks/useAuth';

export default function TabLayout() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const { logout } = useAuth();

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
                headerShown: true,
                headerStyle: {
                    backgroundColor: theme.colors.card,
                },
                headerTintColor: theme.colors.text,
                headerShadowVisible: false,
                headerRight: () => (
                    <Pressable onPress={handleLogout} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                        <Ionicons name="log-out-outline" size={22} color={theme.colors.text} />
                    </Pressable>
                ),
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
                name="map"
                options={{
                    title: t.tabs.map,
                    tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
                }}
            />

            <Tabs.Screen
                name="add"
                options={{
                    title: 'Earnings',
                    tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
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
