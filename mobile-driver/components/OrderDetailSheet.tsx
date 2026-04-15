import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DriverOrder } from '@/utils/types';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#f97316',
    READY: '#3b82f6',
    OUT_FOR_DELIVERY: '#22c55e',
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

interface Props {
    order: DriverOrder;
    routeInfo: { distanceKm: number; durationMin: number } | null;
    previewRouteInfo: { distanceKm: number; durationMin: number } | null;
    isAssignedToMe: boolean;
    onStartNavigation: () => void;
    onMarkPickedUp?: () => Promise<void>;
    onClose: () => void;
    onHeightChange?: (h: number) => void;
}

export function OrderDetailSheet({
    order,
    routeInfo,
    previewRouteInfo,
    isAssignedToMe,
    onStartNavigation,
    onMarkPickedUp,
    onClose,
    onHeightChange,
}: Props) {
    const insets = useSafeAreaInsets();
    const slideY = useRef(new Animated.Value(-300)).current;
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const [markingPickedUp, setMarkingPickedUp] = useState(false);
    const [nowTs, setNowTs] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 20_000);
        return () => clearInterval(id);
    }, []);

    const handleLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
        onHeightChange?.(e.nativeEvent.layout.height);
    }, [onHeightChange]);

    useEffect(() => {
        setItemsExpanded(false);
        slideY.setValue(-300);
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 90,
            friction: 16,
        }).start();
    }, [order?.id]);

    // Swipe up to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy < -6 && Math.abs(gs.dy) > Math.abs(gs.dx),
            onPanResponderMove: (_, gs) => {
                if (gs.dy < 0) slideY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy < -60 || gs.vy < -0.4) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Animated.timing(slideY, {
                        toValue: -300,
                        duration: 160,
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

    const statusColor = STATUS_COLORS[order.status] ?? '#6b7280';
    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const statusIcon = STATUS_ICONS[order.status] ?? 'ellipse-outline';

    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const customerName = isDirectDispatch
        ? (order.recipientName ?? order.recipientPhone ?? null)
        : (order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : '');
    const dropAddress = order.dropOffLocation?.address ?? '';
    const items = order.businesses?.flatMap((b) => b.items ?? []) ?? [];
    const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const deliveryPrice = Number(order.deliveryPrice ?? 0).toFixed(2);
    const driverTip = Number(order.driverTip ?? 0);
    const isDelivering = order.status === 'OUT_FOR_DELIVERY';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';

    // Drive-time ETAs
    const etaToPickup =
        (isReady || isPreparing) && routeInfo
            ? { km: routeInfo.distanceKm, min: Math.round(routeInfo.durationMin) }
            : null;
    const etaToCustomer = (() => {
        if (isDelivering && routeInfo)
            return { km: routeInfo.distanceKm, min: Math.round(routeInfo.durationMin) };
        if ((isReady || isPreparing) && previewRouteInfo)
            return { km: previewRouteInfo.distanceKm, min: Math.round(previewRouteInfo.durationMin) };
        return null;
    })();

    // Food prep countdown
    const prepMinsLeft = isPreparing && order.estimatedReadyAt
        ? (() => {
            const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - nowTs) / 60_000);
            return diff > 0 ? diff : 0;
          })()
        : null;

    const handleMarkPickedUpPress = useCallback(async () => {
        if (!onMarkPickedUp) return;
        setMarkingPickedUp(true);
        try { await onMarkPickedUp(); } finally { setMarkingPickedUp(false); }
    }, [onMarkPickedUp]);

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View style={[styles.sheet, { paddingTop: insets.top + 6 }]} onLayout={handleLayout}>
                {/* Colored accent bar */}
                <View style={[styles.accentLine, { backgroundColor: statusColor }]} />

                <View {...panResponder.panHandlers} style={styles.body}>
                    {/* Row 1: status pill + order # + close */}
                    <View style={styles.topRow}>
                        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                            <Ionicons name={statusIcon as any} size={11} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        {isDirectDispatch && (
                            <View style={styles.directCallBadge}>
                                <Ionicons name="call" size={10} color="#fff" />
                                <Text style={styles.directCallText}>Direct Call</Text>
                            </View>
                        )}
                        <Text style={styles.orderNum}>#{order.displayId ?? '\u2014'}</Text>
                        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                            <Ionicons name="close" size={16} color="#475569" />
                        </Pressable>
                    </View>

                    {/* Row 2: biz avatar + name + customer + earnings */}
                    <View style={styles.infoRow}>
                        <View style={[styles.bizDot, { backgroundColor: statusColor }]}>
                            <Text style={styles.bizDotText}>{bizName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.infoText}>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                            {customerName ? <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text> : null}
                        </View>
                        {/* Driver earnings */}
                        <View style={styles.earningsBadge}>
                            <Text style={styles.earningsLabel}>{isDirectDispatch ? 'agreed fee' : 'earn'}</Text>
                            <Text style={styles.earningsText}>{'\u20ac'}{deliveryPrice}</Text>
                            {driverTip > 0 && (
                                <Text style={[styles.earningsText, { color: '#22C55E', marginLeft: 4 }]}>
                                    +€{driverTip.toFixed(2)} tip
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Prep countdown chip — only when PREPARING */}
                    {isPreparing && (
                        <View style={styles.prepChip}>
                            <Ionicons name="restaurant-outline" size={13} color="#06b6d4" />
                            <Text style={styles.prepChipText}>
                                {prepMinsLeft === null
                                    ? 'Preparing'
                                    : prepMinsLeft === 0
                                    ? 'Almost ready'
                                    : `Food ready in ~${prepMinsLeft} min`}
                            </Text>
                            {prepMinsLeft != null && prepMinsLeft > 0 && (
                                <View style={styles.prepMinsBadge}>
                                    <Text style={styles.prepMinsNum}>{prepMinsLeft}</Text>
                                    <Text style={styles.prepMinsLabel}>min</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Address */}
                    {dropAddress ? (
                        <View style={styles.addressRow}>
                            <Ionicons name="location-outline" size={12} color="#a78bfa" />
                            <Text style={styles.addressText} numberOfLines={1}>{dropAddress}</Text>
                        </View>
                    ) : null}

                    {/* Drive-time ETA chips */}
                    {(etaToPickup || etaToCustomer) && (
                        <View style={styles.etaRow}>
                            {etaToPickup && (
                                <View style={styles.etaChip}>
                                    <Ionicons name="storefront-outline" size={11} color="#3b82f6" />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaBold}>{etaToPickup.km.toFixed(1)} km</Text>
                                        {'  '}~{etaToPickup.min} min to pickup
                                    </Text>
                                </View>
                            )}
                            {etaToCustomer && (
                                <View style={styles.etaChip}>
                                    <Ionicons name="cube-outline" size={11} color="#8b5cf6" />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaBold}>{etaToCustomer.km.toFixed(1)} km</Text>
                                        {'  '}~{etaToCustomer.min} min total
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Items toggle + expanded list */}
                    {items.length > 0 && (
                        <>
                            <Pressable
                                style={[styles.itemsToggle, itemsExpanded && styles.itemsToggleOpen]}
                                onPress={() => setItemsExpanded(v => !v)}
                            >
                                <View style={styles.itemsToggleLeft}>
                                    <Ionicons name="bag-outline" size={13} color="#64748b" />
                                    <Text style={styles.itemsToggleText}>
                                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={13}
                                    color="#475569"
                                />
                            </Pressable>

                            {itemsExpanded && (
                                <View style={styles.itemsList}>
                                    {items.slice(0, 10).map((item, idx: number) => (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.itemRow,
                                                idx < Math.min(items.length, 10) - 1 && styles.itemRowBorder,
                                            ]}
                                        >
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <View style={styles.itemQtyBadge}>
                                                <Text style={styles.itemQtyText}>x{item.quantity}</Text>
                                            </View>
                                        </View>
                                    ))}
                                    {items.length > 10 && (
                                        <Text style={styles.itemsMore}>+{items.length - 10} more items</Text>
                                    )}
                                </View>
                            )}
                        </>
                    )}

                    {/* CTA row */}
                    {isAssignedToMe && (
                        <View style={styles.ctaRow}>
                            {isReady && onMarkPickedUp && (
                                <Pressable
                                    style={[styles.pickupBtn, markingPickedUp && { opacity: 0.65 }]}
                                    onPress={handleMarkPickedUpPress}
                                    disabled={markingPickedUp}
                                >
                                    {markingPickedUp ? (
                                        <ActivityIndicator size={14} color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={15} color="#fff" />
                                            <Text style={styles.pickupBtnText}>Picked Up</Text>
                                        </>
                                    )}
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.navBtn}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onStartNavigation();
                                }}
                            >
                                <Ionicons name="navigate" size={16} color="#fff" />
                                <Text style={styles.navBtnText}>Navigate</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Drag handle */}
                <View style={styles.handle} />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    sheet: {
        backgroundColor: 'rgba(13,17,23,0.97)',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 20,
        overflow: 'hidden',
    },
    accentLine: {
        height: 2,
        opacity: 0.85,
    },
    body: {
        paddingHorizontal: 14,
        gap: 7,
        paddingBottom: 4,
    },

    /* top row */
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingTop: 10,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    directCallBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F97316',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    directCallText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    orderNum: {
        flex: 1,
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
    },
    closeBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* info row */
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bizDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    bizDotText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#fff',
    },
    infoText: {
        flex: 1,
        gap: 2,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '800',
    },
    customerName: {
        color: '#64748b',
        fontSize: 11,
    },
    earningsBadge: {
        backgroundColor: 'rgba(74,222,128,0.10)',
        borderRadius: 10,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.2)',
        alignItems: 'center',
    },
    earningsLabel: {
        color: 'rgba(74,222,128,0.6)',
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 10,
    },
    earningsText: {
        color: '#4ade80',
        fontSize: 13,
        fontWeight: '900',
    },

    /* prep countdown chip */
    prepChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(6,182,212,0.08)',
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.22)',
    },
    prepChipText: {
        color: '#22d3ee',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    prepMinsBadge: {
        backgroundColor: '#06b6d4',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignItems: 'center',
    },
    prepMinsNum: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        lineHeight: 16,
    },
    prepMinsLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    /* address */
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(167,139,250,0.07)',
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    addressText: {
        flex: 1,
        color: '#c4b5fd',
        fontSize: 11,
    },

    /* ETA chips */
    etaRow: {
        flexDirection: 'row',
        gap: 6,
    },
    etaChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    etaText: {
        color: '#94a3b8',
        fontSize: 11,
        flex: 1,
    },
    etaBold: {
        color: '#e2e8f0',
        fontWeight: '700',
    },

    /* items toggle */
    itemsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    itemsToggleOpen: {
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    itemsToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemsToggleText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
    },

    /* items expanded */
    itemsList: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    itemName: {
        color: '#94a3b8',
        fontSize: 12,
        flex: 1,
    },
    itemQtyBadge: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginLeft: 10,
    },
    itemQtyText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    itemsMore: {
        color: '#475569',
        fontSize: 11,
        paddingVertical: 5,
        textAlign: 'center',
    },

    /* CTAs */
    ctaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
        paddingBottom: 2,
    },
    pickupBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    pickupBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    navBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    navBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },

    /* handle */
    handle: {
        width: 32,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
});
