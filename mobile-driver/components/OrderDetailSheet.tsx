import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#06b6d4',
    READY: '#3b82f6',
    OUT_FOR_DELIVERY: '#8b5cf6',
};
const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
};
const STATUS_ICONS: Record<string, string> = {
    PENDING: 'time-outline',
    PREPARING: 'restaurant-outline',
    READY: 'bag-check-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
};

const ITEMS_PREVIEW = 3;

interface Props {
    order: any;
    routeInfo: { distanceKm: number; durationMin: number } | null;
    previewRouteInfo: { distanceKm: number; durationMin: number } | null;
    isAssignedToMe: boolean;
    onStartNavigation: () => void;
    onMarkPickedUp?: () => Promise<void>;
    onClose: () => void;
}

export function OrderDetailSheet({
    order,
    routeInfo,
    previewRouteInfo,
    isAssignedToMe,
    onStartNavigation,
    onMarkPickedUp,
    onClose,
}: Props) {
    const insets = useSafeAreaInsets();
    const slideY = useRef(new Animated.Value(320)).current;
    const [showAllItems, setShowAllItems] = useState(false);
    const [markingPickedUp, setMarkingPickedUp] = useState(false);

    // Simple slide-up on mount / order change
    useEffect(() => {
        slideY.setValue(320);
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 14,
        }).start();
    }, [order?.id]);

    // Drag-to-dismiss
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) slideY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 90 || gs.vy > 0.6) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Animated.timing(slideY, {
                        toValue: 500,
                        duration: 180,
                        useNativeDriver: true,
                    }).start(onClose);
                } else {
                    Animated.spring(slideY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 70,
                        friction: 12,
                    }).start();
                }
            },
        }),
    ).current;

    const handleStart = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStartNavigation();
    }, [onStartNavigation]);

    const handleMarkPickedUp = useCallback(async () => {
        if (!onMarkPickedUp) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMarkingPickedUp(true);
        try {
            await onMarkPickedUp();
        } finally {
            setMarkingPickedUp(false);
        }
    }, [onMarkPickedUp]);

    const statusColor = STATUS_COLORS[order.status] ?? '#6b7280';
    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const statusIcon = STATUS_ICONS[order.status] ?? 'ellipse-outline';

    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : '';
    const dropAddress = order.dropOffLocation?.address ?? '';
    const items: any[] = order.businesses?.flatMap((b: any) => b.items ?? []) ?? [];
    const totalItems = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
    const deliveryPrice = Number(order.deliveryPrice ?? 0).toFixed(2);
    const isDelivering = order.status === 'OUT_FOR_DELIVERY';
    const isReady = order.status === 'READY' || order.status === 'PREPARING';
    const isReadyForPickup = order.status === 'READY';

    // ── ETA rows ──────────────────────────────────────────────────────────────
    // routeInfo      = driver → current destination (pickup when READY, dropoff when delivering)
    // previewRouteInfo = pickup → dropoff (only available while picking up)
    const etaToPickup =
        isReady && routeInfo
            ? { km: routeInfo.distanceKm, min: Math.round(routeInfo.durationMin) }
            : null;
    const etaToCustomer = (() => {
        if (isDelivering && routeInfo)
            return { km: routeInfo.distanceKm, min: Math.round(routeInfo.durationMin) };
        if (isReady && previewRouteInfo)
            return { km: previewRouteInfo.distanceKm, min: Math.round(previewRouteInfo.durationMin) };
        return null;
    })();

    // ── Items list ────────────────────────────────────────────────────────────
    const visibleItems = showAllItems ? items : items.slice(0, ITEMS_PREVIEW);
    const hasMoreItems = items.length > ITEMS_PREVIEW;

    return (
        <Animated.View
            style={[styles.root, { transform: [{ translateY: slideY }] }]}
        >
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 6 }]}>
                {/* ── Drag handle ── */}
                <View {...panResponder.panHandlers} style={styles.dragZone}>
                    <View style={styles.handle} />
                </View>

                <View style={styles.body}>
                    {/* ── Header row: biz name + close + status ── */}
                    <View style={[styles.headerRow, { marginBottom: 8 }]}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                            {customerName ? (
                                <Text style={styles.customerName}>
                                    <Ionicons name="person-outline" size={10} color="#475569" />{' '}
                                    {customerName}
                                </Text>
                            ) : null}
                        </View>
                        <View style={styles.headerRight}>
                            <View style={[styles.statusBadge, {
                                backgroundColor: `${statusColor}1A`,
                                borderColor: `${statusColor}33`,
                            }]}>
                                <Ionicons name={statusIcon as any} size={11} color={statusColor} />
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {statusLabel}
                                </Text>
                            </View>
                            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                                <Ionicons name="close" size={18} color="#475569" />
                            </Pressable>
                        </View>
                    </View>

                    {/* ── Earnings + item count ── */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statTile, styles.statTileEarnings]}>
                            <Text style={styles.statValue}>€{deliveryPrice}</Text>
                            <Text style={styles.statLabel}>You earn</Text>
                        </View>
                        <View style={styles.statTile}>
                            <Text style={styles.statValue}>{totalItems}</Text>
                            <Text style={styles.statLabel}>
                                {totalItems === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                        <View style={styles.statTile}>
                            <Text style={styles.statValue}>
                                #{order.displayId ?? '—'}
                            </Text>
                            <Text style={styles.statLabel}>Order</Text>
                        </View>
                    </View>

                    {/* ── ETA section ── */}
                    {(etaToPickup || etaToCustomer) && (
                        <View style={styles.etaSection}>
                            {etaToPickup && (
                                <View style={styles.etaRow}>
                                    <View style={[styles.etaDot, { backgroundColor: '#3b82f6' }]} />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaStrong}>{etaToPickup.km.toFixed(1)} km</Text>
                                        {' '}to pickup
                                    </Text>
                                    <Text style={styles.etaMin}>~{etaToPickup.min} min</Text>
                                </View>
                            )}
                            {etaToCustomer && (
                                <View style={styles.etaRow}>
                                    <View style={[styles.etaDot, { backgroundColor: '#8b5cf6' }]} />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaStrong}>{etaToCustomer.km.toFixed(1)} km</Text>
                                        {' '}to customer
                                    </Text>
                                    <Text style={styles.etaMin}>~{etaToCustomer.min} min</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── Drop-off address ── */}
                    {dropAddress ? (
                        <View style={styles.addressRow}>
                            <Ionicons name="location-outline" size={13} color="#a78bfa" />
                            <Text style={styles.addressText} numberOfLines={1}>
                                {dropAddress}
                            </Text>
                        </View>
                    ) : null}

                    {/* ── Items list ── */}
                    {items.length > 0 && (
                        <View style={styles.itemsCard}>
                            {visibleItems.map((item: any, idx: number) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.itemRow,
                                        idx < visibleItems.length - 1 && styles.itemRowBorder,
                                    ]}
                                >
                                    <Text style={styles.itemName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                                </View>
                            ))}
                            {hasMoreItems && (
                                <Pressable
                                    onPress={() => setShowAllItems((v) => !v)}
                                    style={styles.showMoreBtn}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllItems
                                            ? 'Show less'
                                            : `+${items.length - ITEMS_PREVIEW} more`}
                                    </Text>
                                    <Ionicons
                                        name={showAllItems ? 'chevron-up' : 'chevron-down'}
                                        size={12}
                                        color="#64748b"
                                    />
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* ── CTA ── */}
                {isAssignedToMe && (
                    <View style={styles.ctaContainer}>
                        {/* Food Picked Up — shows only when the order is physically ready at the counter */}
                        {isReadyForPickup && onMarkPickedUp && (
                            <Pressable
                                onPress={handleMarkPickedUp}
                                disabled={markingPickedUp}
                                style={[styles.ctaButton, styles.ctaPickedUp, markingPickedUp && { opacity: 0.65 }]}
                            >
                                {markingPickedUp ? (
                                    <ActivityIndicator size="small" color="#0f172a" />
                                ) : (
                                    <Ionicons name="bag-check-outline" size={19} color="#0f172a" />
                                )}
                                <Text style={[styles.ctaText, { color: '#0f172a' }]}>
                                    Food Picked Up
                                </Text>
                            </Pressable>
                        )}
                        {/* Navigate button — secondary when READY (food not yet picked up), primary when delivering */}
                        <Pressable
                            onPress={handleStart}
                            style={[
                                styles.ctaButton,
                                isDelivering
                                    ? { backgroundColor: '#7c3aed', shadowColor: '#7c3aed' }
                                    : styles.ctaSecondary,
                            ]}
                        >
                            <Ionicons
                                name={isDelivering ? 'navigate' : 'bicycle-outline'}
                                size={19}
                                color={isDelivering ? '#fff' : '#64748b'}
                            />
                            <Text style={[styles.ctaText, !isDelivering && { color: '#64748b' }]}>
                                {isDelivering ? 'Continue Navigation' : 'Navigate to Pickup'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    sheet: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 20,
    },
    dragZone: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    handle: {
        width: 32,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderRadius: 2,
    },
    body: {
        paddingHorizontal: 16,
    },

    /* ── Header ── */
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 15,
        fontWeight: '800',
    },
    customerName: {
        color: '#475569',
        fontSize: 11,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Stats ── */
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    statTile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        paddingVertical: 7,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 2,
    },
    statTileEarnings: {
        backgroundColor: 'rgba(74,222,128,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.15)',
    },
    statValue: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '800',
    },
    statLabel: {
        color: '#475569',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    /* ── ETA ── */
    etaSection: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
        marginBottom: 8,
    },
    etaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    etaDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    etaText: {
        flex: 1,
        color: '#94a3b8',
        fontSize: 12,
    },
    etaStrong: {
        color: '#f1f5f9',
        fontWeight: '700',
    },
    etaMin: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
    },

    /* ── Address ── */
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(167,139,250,0.07)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
    },
    addressText: {
        flex: 1,
        color: '#cbd5e1',
        fontSize: 12,
    },

    /* ── Items ── */
    itemsCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 4,
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    itemRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    itemName: {
        color: '#cbd5e1',
        fontSize: 12,
        flex: 1,
    },
    itemQty: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    showMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 7,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    showMoreText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '600',
    },

    /* ── CTA ── */
    ctaContainer: {
        paddingHorizontal: 16,
        marginTop: 0,
        gap: 7,
    },
    ctaButton: {
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 10,
    },
    ctaPickedUp: {
        backgroundColor: '#4ade80',
        shadowColor: '#4ade80',
    },
    ctaSecondary: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    ctaText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
