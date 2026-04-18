import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { GET_BUSINESS_ORDERS } from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';
import { View, Text, Platform } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasBusinessPermission } from '@/lib/rbac';
import { UserPermission } from '@/gql/graphql';
import { useTranslation } from '@/hooks/useTranslation';

const PRIMARY = '#7C3AED';

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
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
                style={[indicatorStyle, { marginTop: 4, height: 3, borderRadius: 999, backgroundColor: focused ? PRIMARY : 'transparent' }]}
            />
        </View>
    );
}

export default function TabLayout() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { data } = useQuery(GET_BUSINESS_ORDERS, { pollInterval: 15000 });
    const insets = useSafeAreaInsets();
    const canManageProducts = hasBusinessPermission(user, UserPermission.ManageProducts);
    const canManageSettings = hasBusinessPermission(user, UserPermission.ManageSettings);
    const canViewAnalytics = hasBusinessPermission(user, UserPermission.ViewAnalytics);

    const pendingCount = (data?.orders?.orders || []).filter(
        (o: any) =>
            o.status === 'PENDING' &&
            o.businesses.some((b: any) => b.business.id === user?.businessId)
    ).length;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#e2e8f0',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: {
                    backgroundColor: '#1E293B',
                    borderTopColor: '#334155',
                    borderTopWidth: 1,
                    height: 58 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 8),
                },
                tabBarItemStyle: { paddingVertical: 2 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('tabs.orders', 'Orders'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.orders', 'Orders')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => (
                        <View>
                            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
                            {pendingCount > 0 && (
                                <View style={{
                                    position: 'absolute', top: -4, right: -8,
                                    backgroundColor: '#f59e0b', borderRadius: 10,
                                    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                                }}>
                                    <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>{pendingCount}</Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    href: canManageProducts ? undefined : null,
                    title: t('tabs.products', 'Products'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.products', 'Products')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'fast-food' : 'fast-food-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    href: null,
                    title: t('tabs.dashboard', 'Dashboard'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.dashboard', 'Dashboard')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="finances"
                options={{
                    href: canViewAnalytics ? undefined : null,
                    title: t('tabs.finances', 'Finances'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.finances', 'Finances')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cash' : 'cash-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    href: canViewAnalytics ? undefined : null,
                    title: t('tabs.orders', 'Orders'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.orders', 'Orders')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    href: canManageSettings ? undefined : null,
                    title: t('tabs.settings', 'Settings'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.settings', 'Settings')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: t('tabs.messages', 'Messages'),
                    tabBarLabel: ({ focused, color }) => <TabLabel label={t('tabs.messages', 'Messages')} focused={focused} color={color} />,
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settlement-history"
                options={{
                    href: null,
                    title: t('finances.settlement_request_history', 'Settlement Request History'),
                }}
            />
        </Tabs>
    );
}
