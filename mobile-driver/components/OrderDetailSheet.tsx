import React, { useCallback, useEffect, useRef } from 'react';
import {
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

interface Props {
    order: any;
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

    const handleLayout = useCallback((e: any) => {
        onHeightChange?.(e.nativeEvent.layout.height);
    }, [onHeightChange]);

    useEffect(() => {
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
    const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : '';
    const dropAddress = order.dropOffLocation?.address ?? '';
    const items: any[] = order.businesses?.flatMap((b: any) => b.items ?? []) ?? [];
    const totalItems = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
    const deliveryPrice = Number(order.deliveryPrice ?? 0).toFixed(2);
    const isDelivering = order.status === 'OUT_FOR_DELIVERY';
    const isReady = order.status === 'READY' || order.status === 'PREPARING';

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

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View style={[styles.sheet, { paddingTop: insets.top + 6 }]} onLayout={handleLayout}>
                {/* Colored accent line */}
                <View style={[styles.accentLine, { backgroundColor: statusColor }]} />

                <View {...panResponder.panHandlers} style={styles.body}>
                    {/* Row 1: status pill + order # + earnings + close */}
                    <View style={styles.topRow}>
                        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                            <Ionicons name={statusIcon as any} size={11} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        <Text style={styles.orderNum}>#{order.displayId ?? '—'}</Text>
                        <View style={styles.earningsBadge}>
                            <Text style={styles.earningsText}>€{deliveryPrice}</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                            <Ionicons name="close" size={16} color="#475569" />
                        </Pressable>
                    </View>

                    {/* Row 2: biz + customer */}
                    <View style={styles.infoRow}>
                        <View style={[styles.bizDot, { backgroundColor: statusColor }]}>
                            <Text style={styles.bizDotText}>{bizName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.infoText}>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                            {customerName ? <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text> : null}
                        </View>
                        {/* Item count */}
                        <View style={styles.itemCountBadge}>
                            <Ionicons name="bag-outline" size={11} color="#64748b" />
                            <Text style={styles.itemCountText}>{totalItems}</Text>
                        </View>
                    </View>

                    {/* Row 3: address */}
                    {dropAddress ? (
                        <View style={styles.addressRow}>
                            <Ionicons name="location-outline" size={12} color="#a78bfa" />
                            <Text style={styles.addressText} numberOfLines={1}>{dropAddress}</Text>
                        </View>
                    ) : null}

                    {/* Row 4: ETA chips */}
                    {(etaToPickup || etaToCustomer) && (
                        <View style={styles.etaRow}>
                            {etaToPickup && (
                                <View style={styles.etaChip}>
                                    <Ionicons name="storefront-outline" size={11} color="#3b82f6" />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaBold}>{etaToPickup.km.toFixed(1)} km</Text>
                                        {'  '}~{etaToPickup.min} min
                                    </Text>
                                </View>
                            )}
                            {etaToCustomer && (
                                <View style={styles.etaChip}>
                                    <Ionicons name="cube-outline" size={11} color="#8b5cf6" />
                                    <Text style={styles.etaText}>
                                        <Text style={styles.etaBold}>{etaToCustomer.km.toFixed(1)} km</Text>
                                        {'  '}~{etaToCustomer.min} min
                                    </Text>
                                </View>
                            )}
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
        marginHorizontal: 16,
        borderRadius: 1,
        marginBottom: 8,
        opacity: 0.7,
    },
    body: {
        paddingHorizontal: 14,
        gap: 7,
        paddingBottom: 4,
    },

    /* ── Top row ── */
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
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
    orderNum: {
        flex: 1,
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
    },
    earningsBadge: {
        backgroundColor: 'rgba(74,222,128,0.12)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.2)',
    },
    earningsText: {
        color: '#4ade80',
        fontSize: 12,
        fontWeight: '800',
    },
    closeBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Info row ── */
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bizDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    bizDotText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#fff',
    },
    infoText: {
        flex: 1,
        gap: 1,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '800',
    },
    customerName: {
        color: '#64748b',
        fontSize: 11,
    },
    itemCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    itemCountText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '700',
    },

    /* ── Address ── */
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

    /* ── ETA chips ── */
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

    /* ── Drag handle ── */
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
