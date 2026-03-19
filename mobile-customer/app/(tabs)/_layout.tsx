import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();

    const createTabLabel = (label: string) => {
        return ({ focused, color }: { focused: boolean; color: string }) => (
            <View style={{ alignItems: 'center' }}>
                <Text style={{ color, fontSize: 12 }}>{label}</Text>
                <View
                    style={{
                        marginTop: 3,
                        height: 3,
                        width: 20,
                        borderRadius: 999,
                        backgroundColor: focused ? theme.colors.primary : 'transparent',
                    }}
                />
            </View>
        );
    };

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
                        tabBarLabel: createTabLabel(t.tabs.discover),
                        tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="restaurants"
                    options={{
                        title: t.tabs.restaurants,
                        tabBarLabel: createTabLabel(t.tabs.restaurants),
                        tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="market"
                    options={{
                        title: t.tabs.shops,
                        tabBarLabel: createTabLabel(t.tabs.shops),
                        tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t.tabs.profile,
                        tabBarLabel: createTabLabel(t.tabs.profile),
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
