import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { GET_BUSINESS_ORDERS } from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasBusinessPermission } from '@/lib/rbac';
import { UserPermission } from '@/gql/graphql';
import { useTranslation } from '@/hooks/useTranslation';

export default function TabLayout() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { data } = useQuery(GET_BUSINESS_ORDERS, { pollInterval: 15000 });
    const insets = useSafeAreaInsets();
    const canManageProducts = hasBusinessPermission(user, UserPermission.ManageProducts);
    const canManageSettings = hasBusinessPermission(user, UserPermission.ManageSettings);
    const canViewAnalytics = hasBusinessPermission(user, UserPermission.ViewAnalytics);

    const pendingCount = (data?.orders || []).filter(
        (o: any) =>
            o.status === 'PENDING' &&
            o.businesses.some((b: any) => b.business.id === user?.businessId)
    ).length;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#7C3AED',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: {
                    backgroundColor: '#1E293B',
                    borderTopColor: '#334155',
                    height: (Platform.OS === 'android' ? 62 : 64) + insets.bottom,
                    paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 10),
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 13,
                    fontWeight: '700',
                },
                tabBarIconStyle: {
                    marginBottom: -2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('tabs.orders', 'Orders'),
                    tabBarIcon: ({ color }) => (
                        <View>
                            <Ionicons name="receipt" size={26} color={color} />
                            {pendingCount > 0 && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -8,
                                        backgroundColor: '#f59e0b',
                                        borderRadius: 10,
                                        minWidth: 20,
                                        height: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingHorizontal: 4,
                                    }}
                                >
                                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>
                                        {pendingCount}
                                    </Text>
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
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="fast-food" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    href: canViewAnalytics ? undefined : null,
                    title: t('tabs.dashboard', 'Dashboard'),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="analytics" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="finances"
                options={{
                    href: canViewAnalytics ? undefined : null,
                    title: t('tabs.finances', 'Finances'),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="cash-outline" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    href: canManageSettings ? undefined : null,
                    title: t('tabs.settings', 'Settings'),
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings" size={26} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
