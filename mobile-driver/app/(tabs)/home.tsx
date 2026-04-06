import React, { useState } from "react";
import {
    View,
    Text,
    Switch,
    Alert,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
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
        <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* ── Header row ── */}
                <View style={s.headerRow}>
                    <View>
                        <Text style={[s.greetingLabel, { color: theme.colors.subtext }]}>{greeting}</Text>
                        <Text style={[s.greetingName, { color: theme.colors.text }]}>{firstName} 👋</Text>
                    </View>

                    {/* Online pill + switch */}
                    <View style={[s.onlinePill, {
                        backgroundColor: isOnline ? "#f0fdf4" : theme.colors.card,
                        borderColor: isOnline ? "#86efac" : theme.colors.border,
                    }]}>
                        <View style={[s.onlineDot, { backgroundColor: isOnline ? "#22c55e" : "#9ca3af" }]} />
                        <Text style={[s.onlineLabel, { color: isOnline ? "#15803d" : theme.colors.subtext }]}>
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
                    <View style={s.dispatchBanner}>
                        <Ionicons name="car-outline" size={16} color="#92400e" />
                        <View style={{ flex: 1 }}>
                            <Text style={s.dispatchTitle}>{t.home.dispatch_mode_title}</Text>
                            <Text style={s.dispatchSub}>{t.home.dispatch_mode_sub}</Text>
                        </View>
                    </View>
                )}

                {/* ── Earnings hero card ── */}
                <View style={[s.earningsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={s.earningsHeader}>
                        <Text style={[s.sectionLabel, { color: theme.colors.subtext }]}>{t.home.earnings_today}</Text>
                        {metricsLoading && !m && <ActivityIndicator size="small" color={theme.colors.subtext} />}
                    </View>

                    <Text style={[s.earningsAmount, { color: theme.colors.text }]}>€{netToday.toFixed(2)}</Text>
                    <Text style={[s.earningsSub, { color: theme.colors.subtext }]}>
                        {t.home.your_take} · €{grossToday.toFixed(2)} {t.home.gross}
                    </Text>

                    {grossToday > 0 && (
                        <View style={s.commissionRow}>
                            <View style={s.commissionBadge}>
                                <Text style={s.commissionBadgeText}>
                                    {commissionPct > 0
                                        ? `${commissionPct.toFixed(0)}% ${t.home.commission}`
                                        : `€${commissionTaken.toFixed(2)} ${t.home.commission}`}
                                </Text>
                            </View>
                            <Text style={[s.commissionDeduct, { color: theme.colors.subtext }]}>
                                −€{commissionTaken.toFixed(2)} {t.home.deducted}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Metric tiles ── */}
                <View style={s.tilesRow}>
                    <View style={[s.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <View style={[s.tileIcon, { backgroundColor: "#eff6ff" }]}>
                            <Ionicons name="bicycle-outline" size={20} color="#3b82f6" />
                        </View>
                        <Text style={[s.tileValue, { color: theme.colors.text }]}>{deliveredToday}</Text>
                        <Text style={[s.tileLabel, { color: theme.colors.subtext }]}>{t.home.delivered_today}</Text>
                    </View>
                    <View style={[s.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <View style={[s.tileIcon, { backgroundColor: "#f0fdf4" }]}>
                            <Ionicons name="trending-up-outline" size={20} color="#22c55e" />
                        </View>
                        <Text style={[s.tileValue, { color: theme.colors.text }]}>
                            {deliveredToday > 0 ? `€${avgPerDelivery.toFixed(2)}` : "—"}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.colors.subtext }]}>{t.home.avg_per_delivery}</Text>
                    </View>
                </View>

                {/* ── Capacity bar ── */}
                <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={s.cardRow}>
                        <Text style={[s.cardTitle, { color: theme.colors.text }]}>{t.home.active_orders}</Text>
                        <Text style={[s.cardBadge, {
                            color: capacityColor,
                            backgroundColor: capacityColor + "20",
                        }]}>
                            {activeOrders} / {maxOrders}
                        </Text>
                    </View>
                    <View style={[s.progressTrack, { backgroundColor: theme.colors.border }]}>
                        <View style={[s.progressFill, {
                            width: `${Math.min(100, Math.round(capacityPct * 100))}%` as any,
                            backgroundColor: capacityColor,
                        }]} />
                    </View>
                    <Text style={[s.progressLabel, { color: theme.colors.subtext }]}>
                        {activeOrders === 0
                            ? t.home.no_active_orders
                            : capacityPct >= 1
                            ? t.home.at_max_capacity
                            : `${maxOrders - activeOrders} ${maxOrders - activeOrders !== 1 ? t.home.slots_available : t.home.slot_available}`}
                    </Text>
                </View>

                {/* ── Connection status ── */}
                <View style={[s.connRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={[s.connDot, { backgroundColor: connColor }]} />
                    <Text style={[s.connText, { color: theme.colors.subtext }]}>
                        {t.home.heartbeat}:{" "}
                        <Text style={{ color: connColor, fontWeight: "700" }}>{connLabel}</Text>
                    </Text>
                    {connectionStatus === "STALE" && (
                        <Text style={[s.connHint, { color: theme.colors.subtext }]}>— {t.home.check_signal}</Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

    /* header */
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    greetingLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
    greetingName: { fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
    onlinePill: {
        flexDirection: "row", alignItems: "center", gap: 5,
        borderRadius: 28, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1,
    },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    onlineLabel: { fontSize: 13, fontWeight: "700" },

    /* dispatch banner */
    dispatchBanner: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "#fffbeb", borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
        borderWidth: 1, borderColor: "#fde68a",
    },
    dispatchTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
    dispatchSub: { fontSize: 11, color: "#b45309", marginTop: 1 },

    /* earnings card */
    earningsCard: {
        borderRadius: 24, padding: 22, marginBottom: 12,
        borderWidth: 1,
    },
    earningsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    sectionLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 },
    earningsAmount: { fontSize: 42, fontWeight: "900", letterSpacing: -1, marginBottom: 4 },
    earningsSub: { fontSize: 13, marginBottom: 12 },
    commissionRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    commissionBadge: { backgroundColor: "#fef3c7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    commissionBadgeText: { color: "#92400e", fontSize: 11, fontWeight: "700" },
    commissionDeduct: { fontSize: 11 },

    /* metric tiles */
    tilesRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    tile: {
        flex: 1, borderRadius: 20, padding: 18,
        borderWidth: 1,
    },
    tileIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    tileValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginBottom: 4 },
    tileLabel: { fontSize: 11, fontWeight: "600" },

    /* generic card */
    card: { borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1 },
    cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    cardTitle: { fontSize: 13, fontWeight: "700" },
    cardBadge: { fontSize: 13, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
    progressFill: { height: "100%", borderRadius: 4 },
    progressLabel: { fontSize: 11 },

    /* conn status */
    connRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        borderRadius: 16, padding: 14, borderWidth: 1,
    },
    connDot: { width: 8, height: 8, borderRadius: 4 },
    connText: { fontSize: 12, fontWeight: "600" },
    connHint: { fontSize: 11 },
});
