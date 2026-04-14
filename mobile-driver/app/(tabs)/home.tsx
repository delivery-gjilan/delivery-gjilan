import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
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
import { useRouter } from "expo-router";

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
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

    const m = metricsData?.myDriverMetrics;
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

    const handleOnlineStatusChange = async () => {
        const newStatus = !isOnline;
        try {
            setOnline(newStatus);
            const result = await updateOnlineStatus({ variables: { isOnline: newStatus } });
            const updatedUser = result.data?.updateDriverOnlineStatus;
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

    const capacityColor = capacityPct >= 1 ? "#ef4444" : capacityPct >= 0.75 ? "#f59e0b" : "#22c55e";

    const isDark = theme.colors.background === "#111827" || theme.colors.background === "#0f172a";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* ── Hero Status Card ── */}
                <View style={{
                    margin: 16,
                    borderRadius: 28,
                    overflow: "hidden",
                    backgroundColor: isOnline ? "#0f2318" : (isDark ? "#1c1c1e" : "#f1f5f9"),
                    borderWidth: 1,
                    borderColor: isOnline ? "#16a34a40" : theme.colors.border,
                    padding: 24,
                }}>
                    {/* Greeting */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                        <View>
                            <Text style={{ fontSize: 13, color: isOnline ? "#4ade80" : theme.colors.subtext, marginBottom: 4, fontWeight: "600" }}>
                                {greeting}
                            </Text>
                            <Text style={{ fontSize: 22, fontWeight: "800", color: isOnline ? "#f0fdf4" : theme.colors.text, letterSpacing: -0.4 }}>
                                {firstName} 👋
                            </Text>
                        </View>
                        {metricsLoading && !m && <ActivityIndicator size="small" color={isOnline ? "#4ade80" : theme.colors.subtext} />}
                    </View>

                    {/* Status label */}
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isOnline ? "#86efac" : theme.colors.subtext, marginBottom: 16 }}>
                        {isOnline ? "● You are live — receiving orders" : "○ Go online to start earning"}
                    </Text>

                    {/* Big toggle button */}
                    <TouchableOpacity
                        onPress={handleOnlineStatusChange}
                        disabled={updatingStatus}
                        activeOpacity={0.85}
                        style={{
                            borderRadius: 18,
                            paddingVertical: 16,
                            alignItems: "center",
                            backgroundColor: isOnline ? "#ef444415" : "#16a34a",
                            borderWidth: 1.5,
                            borderColor: isOnline ? "#ef444450" : "#15803d",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 8,
                        }}
                    >
                        {updatingStatus
                            ? <ActivityIndicator size="small" color={isOnline ? "#ef4444" : "#fff"} />
                            : <Ionicons name={isOnline ? "pause-circle-outline" : "play-circle-outline"} size={20} color={isOnline ? "#ef4444" : "#fff"} />
                        }
                        <Text style={{ fontSize: 16, fontWeight: "800", color: isOnline ? "#ef4444" : "#fff", letterSpacing: -0.2 }}>
                            {isOnline ? "Go Offline" : "Go Online"}
                        </Text>
                    </TouchableOpacity>

                    {/* Dispatch mode notice */}
                    {dispatchModeEnabled && isOnline && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, backgroundColor: "#fef3c710", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Ionicons name="car-outline" size={15} color="#fbbf24" />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#fbbf24", flex: 1 }}>
                                {t.home.dispatch_mode_title} — {t.home.dispatch_mode_sub}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Earnings ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: theme.colors.subtext }}>
                            {t.home.earnings_today}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/earnings" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: "600" }}>Details</Text>
                            <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 46, fontWeight: "900", letterSpacing: -2, color: theme.colors.text, marginBottom: 4 }}>
                        €{netToday.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.subtext }}>
                        {t.home.your_take} · €{grossToday.toFixed(2)} {t.home.gross}
                    </Text>
                    {grossToday > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <View style={{ backgroundColor: "#fef3c7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                                <Text style={{ color: "#92400e", fontSize: 11, fontWeight: "700" }}>
                                    {commissionPct > 0 ? `${commissionPct.toFixed(0)}% ${t.home.commission}` : `€${commissionTaken.toFixed(2)} ${t.home.commission}`}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: theme.colors.subtext }}>−€{commissionTaken.toFixed(2)} {t.home.deducted}</Text>
                        </View>
                    )}
                </View>

                {/* ── Stat row ── */}
                <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 }}>
                    {/* Deliveries */}
                    <View style={{ flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6ff", marginBottom: 10 }}>
                            <Ionicons name="bicycle-outline" size={18} color="#3b82f6" />
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, color: theme.colors.text }}>{deliveredToday}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 2 }}>{t.home.delivered_today}</Text>
                    </View>

                    {/* Avg */}
                    <View style={{ flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4", marginBottom: 10 }}>
                            <Ionicons name="trending-up-outline" size={18} color="#22c55e" />
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, color: theme.colors.text }}>
                            {deliveredToday > 0 ? `€${avgPerDelivery.toFixed(2)}` : "—"}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 2 }}>{t.home.avg_per_delivery}</Text>
                    </View>

                    {/* Active */}
                    <View style={{ flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: capacityColor + "50", backgroundColor: theme.colors.card }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: capacityColor + "15", marginBottom: 10 }}>
                            <Ionicons name="layers-outline" size={18} color={capacityColor} />
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, color: capacityColor }}>{activeOrders}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 2 }}>{t.home.active_orders}</Text>
                    </View>
                </View>

                {/* ── Capacity bar ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text }}>Order Capacity</Text>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: capacityColor }}>{activeOrders} / {maxOrders}</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.colors.border, overflow: "hidden" }}>
                        <View style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, Math.round(capacityPct * 100))}%` as any, backgroundColor: capacityColor }} />
                    </View>
                    <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 8 }}>
                        {activeOrders === 0 ? t.home.no_active_orders
                            : capacityPct >= 1 ? t.home.at_max_capacity
                            : `${maxOrders - activeOrders} ${maxOrders - activeOrders !== 1 ? t.home.slots_available : t.home.slot_available}`}
                    </Text>
                </View>

                {/* ── Connection pill ── */}
                <View style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: connColor }} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.subtext }}>
                        {connectionStatus === "CONNECTED" ? (isOnline ? t.home.signal_good : "Offline")
                            : connectionStatus === "STALE" ? `${t.home.signal_weak} — ${t.home.check_signal}`
                            : t.home.signal_lost}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

