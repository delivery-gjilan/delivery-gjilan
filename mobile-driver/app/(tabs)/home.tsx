import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Pressable,
    Alert,
    ActivityIndicator,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuthStore } from "@/store/authStore";
import { UPDATE_DRIVER_ONLINE_STATUS } from "@/graphql/operations/driverLocation";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useSharedOrderAccept } from "@/hooks/GlobalOrderAcceptContext";
import type { DriverOrder } from "@/utils/types";

const UI = {
    card: "#111827",
    cardBorder: "rgba(148,163,184,0.28)",
    text: "#E2E8F0",
    subtext: "#94A3B8",
    accent: "#009de0",
    accentDeep: "#006da3",
};

function formatBizToDropoffKm(order: DriverOrder): string | null {
    const bizLoc = order.businesses?.[0]?.business?.location;
    const dropLoc = order.dropOffLocation;
    const lat1 = Number(bizLoc?.latitude);
    const lon1 = Number(bizLoc?.longitude);
    const lat2 = Number(dropLoc?.latitude);
    const lon2 = Number(dropLoc?.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = 6371 * c;
    return `${km.toFixed(1)} km`;
}

function ItemThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
    if (imageUrl) {
        return <Image source={{ uri: imageUrl }} style={{ width: 22, height: 22, borderRadius: 5 }} />;
    }
    return (
        <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: "rgba(148,163,184,0.22)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#cbd5e1", fontSize: 10, fontWeight: "800" }}>{name.charAt(0).toUpperCase()}</Text>
        </View>
    );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

type CardVariant = "available" | "assigned";

function OrderCard({
    order,
    variant,
    onAccept,
    onOpenDetails,
    currentDriverId,
    accepting,
}: {
    order: DriverOrder;
    variant: CardVariant;
    onAccept?: (id: string) => void;
    onOpenDetails?: (order: DriverOrder) => void;
    currentDriverId: string | undefined;
    accepting?: boolean;
}) {
    const theme = useTheme();

    const firstBusiness = order.businesses?.[0];
    const bizName = firstBusiness?.business?.name ?? "Business";
    const dropAddress = order.dropOffLocation?.address ?? "—";
    const driverTakeHome = Number(order.driverTakeHomePreview ?? order.deliveryPrice ?? 0);
    const orderPrice = Number((order as any).orderPrice ?? 0);
    const inventoryPrice = Number((order as any).inventoryPrice ?? 0);
    const businessPrice = Math.max(0, orderPrice - inventoryPrice);
    const isDirectDispatch = order.channel === "DIRECT_DISPATCH";
    const cashToCollect = Number((order as any).cashToCollect ?? 0);
    const totalPrice = Number(order.totalPrice ?? 0);
    const collectFromCustomer = isDirectDispatch ? cashToCollect : totalPrice;
    const showCollectAmount = !isDirectDispatch || cashToCollect > 0;
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? null;

    const items = order.businesses?.flatMap((b) => b.items ?? []) ?? [];
    const totalStockUnits = items.reduce((sum, item) => sum + (item.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = items.reduce(
        (sum, item) => sum + Math.max(0, item.quantity - (item.inventoryQuantity ?? 0)),
        0,
    );
    const hasInventoryCoverage = totalStockUnits > 0;
    const stockItems = items.filter((item) => (item.inventoryQuantity ?? 0) > 0);
    const businessItems = items.filter((item) => Math.max(0, item.quantity - (item.inventoryQuantity ?? 0)) > 0);
    const dropoffDistanceLabel = formatBizToDropoffKm(order);

    // ETA badge for PREPARING orders
    const etaBadge = useMemo(() => {
        if (order.status !== "PREPARING") return null;
        const readyAt = order.estimatedReadyAt
            ? new Date(order.estimatedReadyAt).getTime()
            : order.preparingAt && order.preparationMinutes
            ? new Date(order.preparingAt).getTime() + order.preparationMinutes * 60000
            : null;
        if (!readyAt) return null;
        const diff = Math.round((readyAt - Date.now()) / 60000);
        if (diff <= 0) return "Ready soon";
        return `Ready in ${diff}m`;
    }, [order]);

    const statusColor =
        order.status === "READY" ? "#22c55e"
        : order.status === "PREPARING" ? "#f59e0b"
        : order.status === "OUT_FOR_DELIVERY" ? "#3b82f6"
        : "#6b7280";

    const statusLabel =
        order.status === "READY" ? "Ready"
        : order.status === "PREPARING" ? "Preparing"
        : order.status === "OUT_FOR_DELIVERY" ? "Out for delivery"
        : order.status;
    const pickupSummary = etaBadge ?? (order.status === "READY" ? "Pickup now" : statusLabel);

    return (
        <Pressable
            disabled={!onOpenDetails}
            onPress={() => onOpenDetails?.(order)}
            style={{
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 20,
            backgroundColor: UI.card,
            borderWidth: 1,
            borderColor:
                isDirectDispatch ? "#f9731640"
                : variant === "available" ? "rgba(0,157,224,0.35)"
                : UI.cardBorder,
            overflow: "hidden",
        }}>
            {isDirectDispatch && <View style={{ height: 4, backgroundColor: "#f97316" }} />}
            {/* Top bar */}
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 10,
            }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: UI.text, flexShrink: 1 }}>
                        {bizName}
                    </Text>
                    {isDirectDispatch && (
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: "rgba(249,115,22,0.12)",
                            borderColor: "rgba(249,115,22,0.5)",
                            borderWidth: 1,
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}>
                            <Ionicons name="call" size={11} color="#f97316" />
                            <Text style={{ fontSize: 10, fontWeight: "800", color: "#ea580c" }}>DIRECT CALL</Text>
                        </View>
                    )}
                    <View style={{
                        backgroundColor: "rgba(148,163,184,0.18)",
                        borderRadius: 8,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: UI.subtext }}>
                            #{order.displayId}
                        </Text>
                    </View>
                </View>
                {/* Status / ETA badge */}
                <View style={{ backgroundColor: statusColor + "20", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>
                        {etaBadge ?? statusLabel}
                    </Text>
                </View>
            </View>

            {isDirectDispatch && recipientLabel && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#f97316" }} numberOfLines={1}>
                        {recipientLabel}
                    </Text>
                </View>
            )}

            {/* Items / pickup plan */}
            {items.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: UI.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Pickup Plan
                    </Text>

                    {hasInventoryCoverage ? (
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#c4b5fd" }}>Inventory</Text>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#a78bfa" }}>×{totalStockUnits}</Text>
                                </View>
                                {stockItems.slice(0, 3).map((item, idx) => (
                                    <View key={`stock-${idx}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 }}>
                                        <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                        <Text style={{ flex: 1, fontSize: 12, color: UI.text }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#a78bfa" }}>×{item.inventoryQuantity ?? 0}</Text>
                                    </View>
                                ))}
                                {stockItems.length > 3 && (
                                    <Text style={{ fontSize: 10, color: UI.subtext, marginTop: 2 }}>+{stockItems.length - 3} more</Text>
                                )}
                            </View>

                            <View style={{ width: 1, backgroundColor: "rgba(148,163,184,0.2)" }} />

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#7dd3fc" }}>Business</Text>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#38bdf8" }}>×{totalMarketUnits}</Text>
                                </View>
                                {businessItems.slice(0, 3).map((item, idx) => {
                                    const fromBusiness = Math.max(0, item.quantity - (item.inventoryQuantity ?? 0));
                                    return (
                                        <View key={`biz-${idx}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 }}>
                                            <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                            <Text style={{ flex: 1, fontSize: 12, color: UI.text }} numberOfLines={1}>{item.name}</Text>
                                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#38bdf8" }}>×{fromBusiness}</Text>
                                        </View>
                                    );
                                })}
                                {businessItems.length > 3 && (
                                    <Text style={{ fontSize: 10, color: UI.subtext, marginTop: 2 }}>+{businessItems.length - 3} more</Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View>
                            {items.slice(0, 4).map((item, idx) => (
                                <View key={`item-${idx}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 }}>
                                    <ItemThumb imageUrl={item.imageUrl} name={item.name} />
                                    <Text style={{ flex: 1, fontSize: 12, color: UI.text }} numberOfLines={1}>{item.name}</Text>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: UI.subtext }}>×{item.quantity}</Text>
                                </View>
                            ))}
                            {items.length > 4 && (
                                <Text style={{ fontSize: 10, color: UI.subtext, marginTop: 2 }}>+{items.length - 4} more</Text>
                            )}
                        </View>
                    )}
                </View>
            )}

            {(isDirectDispatch || totalStockUnits > 0) && (
                <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingBottom: 10, flexWrap: "wrap" }}>
                    {totalStockUnits > 0 && (
                        <View style={{ backgroundColor: "rgba(114,9,183,0.18)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#c4b5fd" }}>📦 {totalStockUnits} inventory</Text>
                        </View>
                    )}
                    {totalMarketUnits > 0 && totalStockUnits > 0 && (
                        <View style={{ backgroundColor: "rgba(0,157,224,0.16)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#7dd3fc" }}>🛒 {totalMarketUnits} business</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Card summary (mirrors accept sheet flow) */}
            {
                <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
                    <View style={{ backgroundColor: "rgba(2,132,199,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(56,189,248,0.25)", paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: "#7dd3fc", textTransform: "uppercase", letterSpacing: 0.4 }}>
                            Route Summary
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Text style={{ fontSize: 12, color: "#bae6fd" }}>{order.status === "OUT_FOR_DELIVERY" ? "Route" : "Pickup"}</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#e0f2fe" }}>{pickupSummary}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Text style={{ fontSize: 12, color: "#bae6fd" }}>Drop-off</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#e0f2fe" }}>
                                {dropoffDistanceLabel ? `${dropoffDistanceLabel} from pickup` : "Address set"}
                            </Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: "rgba(15,23,42,0.45)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(148,163,184,0.18)", paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: UI.subtext, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            Order Summary
                        </Text>
                        {!isDirectDispatch && (
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <Text style={{ fontSize: 12, color: "#fca5a5" }}>Give business</Text>
                                <Text style={{ fontSize: 12, fontWeight: "700", color: "#f87171" }}>€{businessPrice.toFixed(2)}</Text>
                            </View>
                        )}
                        {inventoryPrice > 0 && (
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <Text style={{ fontSize: 12, color: "#c4b5fd" }}>Owed to platform</Text>
                                <Text style={{ fontSize: 12, fontWeight: "700", color: "#a78bfa" }}>€{inventoryPrice.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Text style={{ fontSize: 12, color: "#93c5fd" }}>Collect from customer</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#38bdf8" }}>
                                {showCollectAmount ? `€${collectFromCustomer.toFixed(2)}` : "Confirm at pickup"}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Text style={{ fontSize: 12, color: "#86efac", fontWeight: "700" }}>Your cut</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#22c55e" }}>€{driverTakeHome.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
            }

            {/* Drop-off address */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 14 }}>
                <Ionicons name="location-outline" size={13} color={UI.subtext} />
                <Text style={{ fontSize: 13, color: UI.subtext, flex: 1 }} numberOfLines={1}>
                    {dropAddress}
                </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.18)" }} />

            {/* Footer */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
                {/* Earnings */}
                <View style={{ flex: 1 }}>
                    {/* Net earnings - prominent */}
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: "#22c55e", letterSpacing: -0.5 }}>
                            €{driverTakeHome.toFixed(2)}
                        </Text>
                    </View>
                    
                    {/* Breakdown text */}
                    {order.driverTip > 0 && (
                        <Text style={{ fontSize: 10, color: theme.colors.subtext }}>
                            incl. €{order.driverTip.toFixed(2)} tip
                        </Text>
                    )}
                </View>

                {/* Action button */}
                {variant === "available" && onAccept && (
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onAccept(order.id);
                        }}
                        disabled={!!accepting}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: UI.accentDeep,
                            borderRadius: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 22,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            opacity: accepting ? 0.6 : 1,
                        }}
                    >
                        {accepting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="checkmark-circle" size={17} color="#fff" />
                        )}
                        <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>{accepting ? "Accepting..." : "Accept"}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Pressable>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type TabFilter = "available" | "assigned";

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const isOnline = useAuthStore((s) => s.isOnline);
    const setOnline = useAuthStore((s) => s.setOnline);
    const setUser = useAuthStore((s) => s.setUser);
    const user = useAuthStore((s) => s.user);
    const connectionStatus = useAuthStore((s) => s.connectionStatus);
    const { dispatchModeEnabled } = useStoreStatus();

    const currentDriverId = user?.id;
    const [tab, setTab] = useState<TabFilter>("available");
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updateOnlineStatus] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);

    const {
        assignedOrders,
        poolOrders,
        isOrdersBootstrapping,
        accepting,
        handleAcceptOrder,
    } = useSharedOrderAccept();

    const handleOnlineStatusChange = useCallback(async () => {
        const newStatus = !isOnline;
        setUpdatingStatus(true);
        try {
            setOnline(newStatus);
            const result = await updateOnlineStatus({ variables: { isOnline: newStatus } });
            const updatedUser = result.data?.updateDriverOnlineStatus;
            if (updatedUser) setUser(updatedUser as any);
            if (newStatus) setTab("available");
        } catch {
            setOnline(!newStatus);
            Alert.alert(t.common.error, t.home.error_update_status);
        } finally {
            setUpdatingStatus(false);
        }
    }, [isOnline, setOnline, setUser, updateOnlineStatus, t]);

    const connColor =
        connectionStatus === "CONNECTED" ? "#22c55e"
        : connectionStatus === "STALE" ? "#f59e0b"
        : connectionStatus === "DISCONNECTED" ? "#6b7280"
        : "#ef4444";

    const connLabel =
        connectionStatus === "CONNECTED" ? (isOnline ? t.home.signal_good : t.home.offline)
        : connectionStatus === "STALE" ? `${t.home.signal_weak} — ${t.home.check_signal}`
        : connectionStatus === "DISCONNECTED" ? t.home.signal_connecting
        : t.home.signal_lost;

    const displayedOrders: DriverOrder[] = tab === "available" ? poolOrders : assignedOrders;

    const ListHeader = (
        <View>
            {/* ── Page header ── */}
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 12,
            }}>
                <View>
                    {/* Connection pill */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connColor }} />
                        <Text style={{ fontSize: 11, fontWeight: "600", color: UI.subtext }}>
                            {connLabel}
                        </Text>
                    </View>
                </View>

                {/* Online / Offline pill toggle */}
                <TouchableOpacity
                    onPress={handleOnlineStatusChange}
                    disabled={updatingStatus}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        backgroundColor: isOnline ? "rgba(0,157,224,0.18)" : "rgba(15,23,42,0.88)",
                        borderWidth: 1.5,
                        borderColor: isOnline ? "rgba(0,157,224,0.55)" : "rgba(148,163,184,0.25)",
                    }}
                >
                    {updatingStatus
                        ? <ActivityIndicator size="small" color={isOnline ? "#4ade80" : theme.colors.subtext} />
                        : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? UI.accent : "#6b7280" }} />
                    }
                    <Text style={{ fontSize: 13, fontWeight: "800", color: isOnline ? "#67e8f9" : UI.subtext }}>
                        {isOnline ? t.home.online : t.home.offline}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dispatch mode banner */}
            {dispatchModeEnabled && isOnline && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: "rgba(0,109,163,0.14)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(0,157,224,0.26)" }}>
                    <Ionicons name="car-outline" size={15} color="#fbbf24" />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#67e8f9", flex: 1 }}>
                        {t.home.dispatch_mode_title} — {t.home.dispatch_mode_sub}
                    </Text>
                </View>
            )}

            {/* ── Status rail ── */}
            <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12, gap: 8 }}>
                {(["available", "assigned"] as TabFilter[]).map((f) => {
                    const count = f === "available" ? poolOrders.length : assignedOrders.length;
                    const active = tab === f;
                    const activeColor = f === "available" ? "#22c55e" : "#3b82f6";
                    return (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setTab(f)}
                            activeOpacity={0.8}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                paddingVertical: 10,
                                borderRadius: 14,
                                backgroundColor: active ? activeColor + "22" : "rgba(15,23,42,0.9)",
                                borderWidth: 1.5,
                                borderColor: active ? activeColor + "70" : "rgba(148,163,184,0.22)",
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "800", color: active ? activeColor : UI.subtext }}>
                                {f === "available" ? t.home.tab_available : t.home.tab_my_orders}
                            </Text>
                            {count > 0 && (
                                <View style={{ backgroundColor: active ? activeColor : "rgba(148,163,184,0.28)", borderRadius: 8, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: "center" }}>
                                    <Text style={{ fontSize: 11, fontWeight: "800", color: active ? "#fff" : UI.subtext }}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    // ── Empty / loading states ──
    if (isOrdersBootstrapping) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
                {ListHeader}
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 12, fontSize: 14, color: UI.subtext }}>{t.common.loading}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <FlatList
                data={displayedOrders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        variant={tab}
                        onAccept={tab === "available" ? handleAcceptOrder : undefined}
                        onOpenDetails={undefined}
                        currentDriverId={currentDriverId}
                        accepting={accepting}
                    />
                )}
                ListHeaderComponent={ListHeader}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 }}>
                        {!isOnline ? (
                            <>
                                <Ionicons name="power-outline" size={48} color={UI.subtext} style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, fontWeight: "700", color: UI.text, textAlign: "center", marginBottom: 6 }}>
                                    {t.home.offline_title}
                                </Text>
                                <Text style={{ fontSize: 14, color: UI.subtext, textAlign: "center" }}>
                                    {t.home.offline_sub}
                                </Text>
                            </>
                        ) : tab === "available" ? (
                            <>
                                <Ionicons name="time-outline" size={48} color={UI.subtext} style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, fontWeight: "700", color: UI.text, textAlign: "center", marginBottom: 6 }}>
                                    {t.home.waiting_title}
                                </Text>
                                <Text style={{ fontSize: 14, color: UI.subtext, textAlign: "center" }}>
                                    {t.home.waiting_sub}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-outline" size={48} color={UI.subtext} style={{ marginBottom: 16 }} />
                                <Text style={{ fontSize: 17, fontWeight: "700", color: UI.text, textAlign: "center", marginBottom: 6 }}>
                                    {t.home.no_assigned_title}
                                </Text>
                                <Text style={{ fontSize: 14, color: UI.subtext, textAlign: "center" }}>
                                    {t.home.no_assigned_sub}
                                </Text>
                            </>
                        )}
                    </View>
                }
            />
        </SafeAreaView>
    );
}

