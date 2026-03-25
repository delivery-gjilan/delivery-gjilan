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
            <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Text
                    style={{
                        color,
                        fontSize: 11,
                        fontWeight: focused ? '700' : '500',
                        letterSpacing: 0.2,
                    }}
                >
                    {label}
                </Text>
                <View
                    style={{
                        marginTop: 5,
                        height: 3,
                        width: focused ? 24 : 16,
                        borderRadius: 999,
                        backgroundColor: focused ? theme.colors.primary : 'transparent',
                    }}
                />
            </View>
        );
    };

    return (
        <Tabs
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
                    tabBarItemStyle: {
                        paddingVertical: 2,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: t.tabs.discover,
                        tabBarLabel: createTabLabel(t.tabs.discover),
                        tabBarIcon: ({ focused, color, size }) => (
                            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="restaurants"
                    options={{
                        title: t.tabs.restaurants,
                        tabBarLabel: createTabLabel(t.tabs.restaurants),
                        tabBarIcon: ({ focused, color, size }) => (
                            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="market"
                    options={{
                        title: t.tabs.shops,
                        tabBarLabel: createTabLabel(t.tabs.shops),
                        tabBarIcon: ({ focused, color, size }) => (
                            <Ionicons name={focused ? 'basket' : 'basket-outline'} size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t.tabs.profile,
                        tabBarLabel: createTabLabel(t.tabs.profile),
                        tabBarIcon: ({ focused, color, size }) => (
                            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="analytics"
                    options={{
                        href: null,
                    }}
                />
        </Tabs>
    );
}
