import React, { useState } from 'react';
import {
    View,
    Text,
    Switch,
    Alert,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_DRIVER_ONLINE_STATUS } from '@/graphql/operations/driverLocation';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { useStoreStatus } from '@/hooks/useStoreStatus';

/* ─── Metric tile ─── */
function MetricTile({
    icon,
    iconColor,
    iconBg,
    value,
    label,
}: {
    icon: string;
    iconColor: string;
    iconBg: string;
    value: string;
    label: string;
}) {
    const theme = useTheme();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.colors.card,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
            }}
        >
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                }}
            >
                <Ionicons name={icon as any} size={18} color={iconColor} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.colors.text }}>
                {value}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.subtext, marginTop: 2 }}>
                {label}
            </Text>
        </View>
    );
}

export default function Home() {
    const theme = useTheme();
    const isOnline = useAuthStore((state) => state.isOnline);
    const setOnline = useAuthStore((state) => state.setOnline);
    const setUser = useAuthStore((state) => state.setUser);
    const user = useAuthStore((state) => state.user);
    const connectionStatus = useAuthStore((state) => state.connectionStatus);

    const firstName = user?.firstName || 'Driver';
    const [refreshing, setRefreshing] = useState(false);
    const { dispatchModeEnabled } = useStoreStatus();

    const [updateOnlineStatus, { loading: updatingStatus }] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);

    const { data: metricsData, loading: metricsLoading, refetch } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 30_000,
    });

    const m = (metricsData as any)?.myDriverMetrics;
    const grossToday = m?.grossEarningsToday ?? 0;
    const netToday = m?.netEarningsToday ?? 0;
    const deliveredToday = m?.deliveredTodayCount ?? 0;
    const commissionPct = m?.commissionPercentage ?? 0;
    const activeOrders = m?.activeOrdersCount ?? 0;
    const maxOrders = m?.maxActiveOrders ?? 5;

    const avgPerDelivery = deliveredToday > 0 ? grossToday / deliveredToday : 0;
    const capacityPct = maxOrders > 0 ? activeOrders / maxOrders : 0;
    const commissionTaken = grossToday - netToday;

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleOnlineStatusChange = async (newStatus: boolean) => {
        try {
            setOnline(newStatus);
            const result = await updateOnlineStatus({ variables: { isOnline: newStatus } });
            const updatedUser = (result.data as any)?.updateDriverOnlineStatus;
            if (updatedUser) setUser(updatedUser);
        } catch {
            setOnline(!newStatus);
            Alert.alert('Error', 'Failed to update status. Try again.');
        }
    };

    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const connColor =
        connectionStatus === 'CONNECTED'
            ? '#22c55e'
            : connectionStatus === 'STALE'
            ? '#f59e0b'
            : '#ef4444';

    const connLabel =
        connectionStatus === 'CONNECTED'
            ? 'Signal good'
            : connectionStatus === 'STALE'
            ? 'Weak signal'
            : connectionStatus === 'LOST'
            ? 'Signal lost'
            : 'Offline';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 20,
                    }}
                >
                    <View>
                        <Text style={{ fontSize: 13, color: theme.colors.subtext, fontWeight: '500' }}>
                            {greeting}
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text }}>
                            {firstName} 👋
                        </Text>
                    </View>

                    {/* Online toggle pill */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: isOnline ? '#dcfce7' : theme.colors.card,
                            borderRadius: 24,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderWidth: 1,
                            borderColor: isOnline ? '#86efac' : theme.colors.border,
                        }}
                    >
                        <View
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
                            }}
                        />
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: isOnline ? '#15803d' : theme.colors.subtext,
                            }}
                        >
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                        <Switch
                            value={isOnline}
                            onValueChange={handleOnlineStatusChange}
                            disabled={updatingStatus}
                            trackColor={{ false: theme.colors.border, true: '#86efac' }}
                            thumbColor={isOnline ? '#22c55e' : '#d1d5db'}
                            style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
                        />
                    </View>
                </View>

                {/* Dispatch mode pill — shown to driver when admin is dispatching */}
                {dispatchModeEnabled && isOnline && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: '#fffbeb',
                            borderRadius: 14,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            marginBottom: 14,
                            borderWidth: 1,
                            borderColor: '#fde68a',
                        }}
                    >
                        <Ionicons name="car-outline" size={16} color="#92400e" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400e' }}>
                                Admin is dispatching orders
                            </Text>
                            <Text style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>
                                Wait for assignment — orders will be sent to you directly
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Today's earnings card ── */}
                <View
                    style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: 24,
                        padding: 20,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: theme.colors.subtext,
                            textTransform: 'uppercase',
                            letterSpacing: 1.2,
                            marginBottom: 10,
                        }}
                    >
                        Today's Earnings
                    </Text>

                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            marginBottom: 14,
                        }}
                    >
                        <View>
                            <Text style={{ fontSize: 38, fontWeight: '900', color: theme.colors.text }}>
                                €{netToday.toFixed(2)}
                            </Text>
                            <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 2 }}>
                                your take · €{grossToday.toFixed(2)} gross
                            </Text>
                        </View>
                        {metricsLoading && !m && (
                            <ActivityIndicator size="small" color={theme.colors.subtext} />
                        )}
                    </View>

                    {/* Commission chip */}
                    {grossToday > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View
                                style={{
                                    backgroundColor: '#fef3c7',
                                    borderRadius: 20,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                }}
                            >
                                <Text style={{ color: '#92400e', fontSize: 11, fontWeight: '700' }}>
                                    {commissionPct > 0
                                        ? `${commissionPct.toFixed(0)}% commission`
                                        : `€${commissionTaken.toFixed(2)} commission`}
                                </Text>
                            </View>
                            <Text style={{ color: theme.colors.subtext, fontSize: 11 }}>
                                −€{commissionTaken.toFixed(2)} deducted
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Metric tiles ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <MetricTile
                        icon="bicycle-outline"
                        iconColor="#3b82f6"
                        iconBg="#eff6ff"
                        value={String(deliveredToday)}
                        label="Delivered Today"
                    />
                    <MetricTile
                        icon="trending-up-outline"
                        iconColor="#22c55e"
                        iconBg="#f0fdf4"
                        value={deliveredToday > 0 ? `€${avgPerDelivery.toFixed(2)}` : '—'}
                        label="Avg per Delivery"
                    />
                </View>

                {/* ── Capacity bar ── */}
                <View
                    style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: 20,
                        padding: 18,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>
                            Active Orders
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text }}>
                            {activeOrders} / {maxOrders}
                        </Text>
                    </View>
                    <View
                        style={{
                            height: 8,
                            backgroundColor: theme.colors.border,
                            borderRadius: 4,
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                height: '100%',
                                width: `${Math.min(100, Math.round(capacityPct * 100))}%`,
                                borderRadius: 4,
                                backgroundColor:
                                    capacityPct >= 1
                                        ? '#ef4444'
                                        : capacityPct >= 0.75
                                        ? '#f59e0b'
                                        : '#22c55e',
                            }}
                        />
                    </View>
                    <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 6 }}>
                        {activeOrders === 0
                            ? 'No active orders — ready for new ones'
                            : capacityPct >= 1
                            ? 'At max capacity'
                            : `${maxOrders - activeOrders} slot${maxOrders - activeOrders !== 1 ? 's' : ''} available`}
                    </Text>
                </View>

                {/* ── Connection status ── */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: theme.colors.card,
                        borderRadius: 16,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                    }}
                >
                    <View
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: connColor,
                        }}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.subtext }}>
                        Heartbeat: <Text style={{ color: connColor }}>{connLabel}</Text>
                    </Text>
                    {connectionStatus === 'STALE' && (
                        <Text style={{ fontSize: 11, color: theme.colors.subtext }}>
                            — check signal
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

