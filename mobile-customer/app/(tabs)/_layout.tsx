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
                    tabBarActiveTintColor: theme.colors.text,
                    tabBarInactiveTintColor: theme.colors.subtext,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: t.tabs.discover,
                        tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="restaurants"
                    options={{
                        title: t.tabs.restaurants,
                        tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="market"
                    options={{
                        title: t.tabs.shops,
                        tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t.tabs.profile,
                        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="analytics"
                    options={{
                        href: null,
                    }}
                />
            </Tabs>
        </>
    );
}
