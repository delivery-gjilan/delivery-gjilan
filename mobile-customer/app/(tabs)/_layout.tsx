import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();

    return (
        <>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: theme.colors.card,
                        borderTopColor: theme.colors.border,
                        height: 48 + insets.bottom,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.subtext,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Restaurants',
                        tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Market',
                        tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="analytics"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}
