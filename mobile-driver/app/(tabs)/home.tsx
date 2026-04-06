import React, { useState } from "react";
import {
    View,
    Text,
    Switch,
    Alert,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuthStore } from "@/store/authStore";
import { UPDATE_DRIVER_ONLINE_STATUS } from "@/graphql/operations/driverLocation";
import { GET_MY_DRIVER_METRICS } from "@/graphql/operations/driver";
import { useStoreStatus } from "@/hooks/useStoreStatus";

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const isOnline = useAuthStore((s) => s.isOnline);
    const setOnline = useAuthStore((s) => s.setOnline);
    const setUser = useAuthStore((s) => s.setUser);
    const user = useAuthStore((s) => s.user);
    const connectionStatus = useAuthStore((s) => s.connectionStatus);
    const { dispatchModeEnabled } = useStoreStatus();

    const firstName = user?.firstName || "Driver";
    const [refreshing, setRefreshing] = useState(false);

    const [updateOnlineStatus, { loading: updatingStatus }] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);
    const { data: metricsData, loading: metricsLoading, refetch } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: "cache-and-network",
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
            Alert.alert(t.common.error, t.home.error_update_status);
        }
    };

    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? t.home.greeting_morning
        : hour < 17 ? t.home.greeting_afternoon
        : t.home.greeting_evening;

    const connColor =
        connectionStatus === "CONNECTED" ? "#22c55e"
        : connectionStatus === "STALE" ? "#f59e0b"
        : "#ef4444";

    const connLabel =
        connectionStatus === "CONNECTED" ? (isOnline ? t.home.signal_good : t.home.offline)
        : connectionStatus === "STALE" ? t.home.signal_weak
        : connectionStatus === "LOST" ? t.home.signal_lost
        : t.home.offline;

    const capacityColor = capacityPct >= 1 ? "#ef4444" : capacityPct >= 0.75 ? "#f59e0b" : "#22c55e";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* ── Header ── */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <View>
                        <Text style={{ fontSize: 13, color: theme.colors.subtext, marginBottom: 2 }}>{greeting}</Text>
                        <Text style={{ fontSize: 26, fontWeight: "800", color: theme.colors.text, letterSpacing: -0.5 }}>
                            {firstName} 👋
                        </Text>
                    </View>

                    {/* Online toggle */}
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: isOnline ? "#f0fdf4" : theme.colors.card,
                        borderRadius: 28,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderWidth: 1,
                        borderColor: isOnline ? "#86efac" : theme.colors.border,
                    }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? "#22c55e" : "#9ca3af" }} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: isOnline ? "#15803d" : theme.colors.subtext }}>
                            {isOnline ? t.home.online : t.home.offline}
                        </Text>
                        <Switch
                            value={isOnline}
                            onValueChange={handleOnlineStatusChange}
                            disabled={updatingStatus}
                            trackColor={{ false: theme.colors.border, true: "#86efac" }}
                            thumbColor={isOnline ? "#22c55e" : "#d1d5db"}
                            style={{ transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }] }}
                        />
                    </View>
                </View>

                {/* ── Dispatch banner ── */}
                {dispatchModeEnabled && isOnline && (
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        backgroundColor: "#fffbeb",
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: "#fde68a",
                    }}>
                        <Ionicons name="car-outline" size={16} color="#92400e" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400e" }}>{t.home.dispatch_mode_title}</Text>
                            <Text style={{ fontSize: 11, color: "#b45309", marginTop: 1 }}>{t.home.dispatch_mode_sub}</Text>
                        </View>
                    </View>
                )}

                {/* ── Earnings hero ── */}
                <View style={{
                    borderRadius: 24,
                    padding: 22,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: theme.colors.subtext }}>
                            {t.home.earnings_today}
                        </Text>
                        {metricsLoading && !m && <ActivityIndicator size="small" color={theme.colors.subtext} />}
                    </View>

                    <Text style={{ fontSize: 44, fontWeight: "900", letterSpacing: -1.5, color: theme.colors.text, marginBottom: 4 }}>
                        €{netToday.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.subtext, marginBottom: grossToday > 0 ? 14 : 0 }}>
                        {t.home.your_take} · €{grossToday.toFixed(2)} {t.home.gross}
                    </Text>

                    {grossToday > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <View style={{ backgroundColor: "#fef3c7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ color: "#92400e", fontSize: 11, fontWeight: "700" }}>
                                    {commissionPct > 0
                                        ? `${commissionPct.toFixed(0)}% ${t.home.commission}`
                                        : `€${commissionTaken.toFixed(2)} ${t.home.commission}`}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: theme.colors.subtext }}>
                                −€{commissionTaken.toFixed(2)} {t.home.deducted}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Stat tiles ── */}
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6ff", marginBottom: 12 }}>
                            <Ionicons name="bicycle-outline" size={20} color="#3b82f6" />
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: "900", letterSpacing: -0.5, color: theme.colors.text, marginBottom: 2 }}>
                            {deliveredToday}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.subtext }}>{t.home.delivered_today}</Text>
                    </View>

                    <View style={{ flex: 1, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4", marginBottom: 12 }}>
                            <Ionicons name="trending-up-outline" size={20} color="#22c55e" />
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: "900", letterSpacing: -0.5, color: theme.colors.text, marginBottom: 2 }}>
                            {deliveredToday > 0 ? `€${avgPerDelivery.toFixed(2)}` : "—"}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.subtext }}>{t.home.avg_per_delivery}</Text>
                    </View>
                </View>

                {/* ── Capacity ── */}
                <View style={{ borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>{t.home.active_orders}</Text>
                        <View style={{ backgroundColor: capacityColor + "20", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 13, fontWeight: "800", color: capacityColor }}>{activeOrders} / {maxOrders}</Text>
                        </View>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: theme.colors.border, marginBottom: 10 }}>
                        <View style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${Math.min(100, Math.round(capacityPct * 100))}%` as any,
                            backgroundColor: capacityColor,
                        }} />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                        {activeOrders === 0
                            ? t.home.no_active_orders
                            : capacityPct >= 1
                            ? t.home.at_max_capacity
                            : `${maxOrders - activeOrders} ${maxOrders - activeOrders !== 1 ? t.home.slots_available : t.home.slot_available}`}
                    </Text>
                </View>

                {/* ── Connection status ── */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connColor }} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.subtext, flex: 1 }}>
                        {t.home.heartbeat}:{" "}
                        <Text style={{ color: connColor, fontWeight: "700" }}>{connLabel}</Text>
                        {connectionStatus === "STALE" ? <Text>{"  —  "}{t.home.check_signal}</Text> : null}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}


