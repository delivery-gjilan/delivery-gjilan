import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from '@/hooks/useTranslations';
import { calculateRouteDistance } from '@/utils/mapbox';
import type { DriverOrder } from '@/utils/types';

const COUNTDOWN_DURATION = 15;
const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

interface Props {
    order: DriverOrder;
    onAccept: (orderId: string) => void;
    onAcceptAndNavigate?: (orderId: string) => void;
    onSkip: () => void;
    accepting?: boolean;
    /** When false, no countdown timer runs (manual pick from pool). Default true. */
    autoCountdown?: boolean;
    onHeightChange?: (h: number) => void;
    /** When true, shows a "someone else picked it" overlay and blocks interaction. */
    takenByOther?: boolean;
}

export function OrderAcceptSheet({
    order,
    onAccept,
    onAcceptAndNavigate,
    onSkip,
    accepting = false,
    autoCountdown = true,
    onHeightChange,
    takenByOther = false,
}: Props) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const s = t.orderAccept;
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const slideY = useRef(new Animated.Value(-500)).current;
    // Tick every 30s so ETA display stays live
    const [nowTs, setNowTs] = useState(() => Date.now());

    // Route distance (driver → business → customer)
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

    // Compute total route distance: business → customer dropoff
    useEffect(() => {
        setRouteInfo(null);
        const bizLoc = order?.businesses?.[0]?.business?.location;
        const dropLoc = order?.dropOffLocation;
        if (!bizLoc?.latitude || !dropLoc?.latitude) return;
        let cancelled = false;
        calculateRouteDistance(
            { latitude: bizLoc.latitude, longitude: bizLoc.longitude },
            { latitude: dropLoc.latitude, longitude: dropLoc.longitude },
        ).then((result) => {
            if (!cancelled && result) setRouteInfo(result);
        });
        return () => { cancelled = true; };
    }, [order?.id]);

    useEffect(() => {
        // Collapse items on new order
        setItemsExpanded(false);
        slideY.setValue(-500);
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 85,
            friction: 16,
        }).start();
    }, [order?.id]);

    useEffect(() => {
        if (!autoCountdown) {
            setCountdown(COUNTDOWN_DURATION);
            return;
        }

        setCountdown(COUNTDOWN_DURATION);
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    onSkip();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id, autoCountdown]);

    // Swipe up to skip
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
                        toValue: -500,
                        duration: 160,
                        useNativeDriver: true,
                    }).start(onSkip);
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

    const handleAccept = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAccept(order.id);
    }, [order?.id, onAccept]);

    const handleAcceptAndNavigate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onAcceptAndNavigate?.(order.id);
    }, [order?.id, onAcceptAndNavigate]);

    // â”€â”€ Derived display values â”€â”€
    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const allItems = (order.businesses ?? []).flatMap((b) => b.items ?? []);
    const itemCount = allItems.length;
    const dropAddress = order.dropOffLocation?.address ?? '';
    const shortAddress = dropAddress.split(',')[0] || s.see_map;
    const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);

    // ETA: descriptive label for food readiness
    const etaLabel = (() => {
        if (order.status === 'READY') return s.ready_now;
        if (order.estimatedReadyAt) {
            const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - nowTs) / 60_000);
            if (diff > 0) return s.ready_in.replace('{{min}}', String(diff));
            return s.almost_ready;
        }
        if (order.status === 'PREPARING') return s.preparing;
        return null;
    })();
    const etaIsReady = order.status === 'READY';

    const ringOffset = (RING_C * (COUNTDOWN_DURATION - countdown)) / COUNTDOWN_DURATION;
    const isUrgent = countdown <= 5;

    // Inventory breakdown
    const stockItems = allItems.filter((it) => (it.inventoryQuantity ?? 0) > 0);
    const totalStockUnits = allItems.reduce((sum, it) => sum + (it.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = allItems.reduce((sum, it) => sum + Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)), 0);
    const hasInventory = totalStockUnits > 0;

    // Cash breakdown — derive market cost from available fields
    // businessPrice (market items) = orderPrice - inventoryPrice
    const orderPrice = Number((order as any).orderPrice ?? 0);
    const inventoryPrice = Number((order as any).inventoryPrice ?? 0);
    const businessPrice = Math.max(0, orderPrice - inventoryPrice);
    const totalPrice = Number(order.totalPrice ?? 0);

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View
                style={[styles.sheet, { paddingTop: insets.top + 8 }]}
                onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
            >
                {/* Draggable body */}
                <View {...panResponder.panHandlers} style={styles.dragBody}>

                    {/* Header: countdown ring + label + business name */}
                    <View style={styles.headerRow}>
                        {autoCountdown ? (
                            <View style={styles.ringContainer}>
                                <Svg width={52} height={52} viewBox="0 0 52 52">
                                    <Circle
                                        cx={26} cy={26} r={RING_R}
                                        stroke="#E5E7EB"
                                        strokeWidth={3.5} fill="none"
                                    />
                                    <Circle
                                        cx={26} cy={26} r={RING_R}
                                        stroke={isUrgent ? '#EF4444' : '#10B981'}
                                        strokeWidth={3.5} fill="none"
                                        strokeDasharray={`${RING_C} ${RING_C}`}
                                        strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                        rotation="-90" origin="26, 26"
                                    />
                                </Svg>
                                <Text style={[styles.countdownText, isUrgent && { color: '#EF4444' }]}>
                                    {countdown}
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.headerTextBlock}>
                            <Text style={styles.headerLabel}>{s.new_order}</Text>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                        </View>
                    </View>

                    {/* Info row: earnings / ETA / distance / drop-off */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoValue}>€{deliveryFee}</Text>
                            <Text style={styles.infoLabel}>{s.you_earn}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        {etaLabel ? (
                            <>
                                <View style={styles.infoItem}>
                                    <Text style={[styles.infoValue, etaIsReady && { color: '#10B981' }]}>{etaLabel}</Text>
                                    <Text style={styles.infoLabel}>{s.food_status}</Text>
                                </View>
                                <View style={styles.infoDivider} />
                            </>
                        ) : null}
                        {routeInfo ? (
                            <>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoValue}>{routeInfo.distanceKm.toFixed(1)} km</Text>
                                    <Text style={styles.infoLabel}>{s.total_route}</Text>
                                </View>
                                <View style={styles.infoDivider} />
                            </>
                        ) : null}
                        <View style={[styles.infoItem, { flex: 1 }]}>
                            <Text style={styles.infoValue} numberOfLines={1}>{shortAddress}</Text>
                            <Text style={styles.infoLabel}>{s.dropoff}</Text>
                        </View>
                    </View>

                    {/* Items toggle */}
                    <Pressable
                        style={[styles.itemsToggle, itemsExpanded && styles.itemsToggleOpen]}
                        onPress={() => setItemsExpanded(v => !v)}
                    >
                        <View style={styles.itemsToggleLeft}>
                            <Ionicons name="bag-handle-outline" size={15} color="#6B7280" />
                            <Text style={styles.itemsToggleText}>
                                {itemCount} {itemCount === 1 ? s.item : s.items}
                            </Text>
                        </View>
                        <Ionicons
                            name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color="#9CA3AF"
                        />
                    </Pressable>

                    {/* Items expanded list */}
                    {itemsExpanded && allItems.length > 0 && (
                        <View style={styles.itemsList}>
                            {allItems.slice(0, 8).map((item, idx: number) => (
                                <View key={idx} style={[styles.itemRow, idx < allItems.slice(0, 8).length - 1 && styles.itemRowBorder]}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.itemQtyBadge}>
                                        <Text style={styles.itemQtyText}>x{item.quantity}</Text>
                                    </View>
                                </View>
                            ))}
                            {allItems.length > 8 && (
                                <Text style={styles.itemsMore}>{s.more.replace('{{count}}', String(allItems.length - 8))}</Text>
                            )}
                        </View>
                    )}

                    {/* Inventory banner — shown when any items come from operator stock */}
                    {hasInventory && (
                        <View style={styles.inventoryBanner}>
                            <View style={styles.inventoryBannerHeader}>
                                <Ionicons name="cube-outline" size={13} color="#7c3aed" />
                                <Text style={styles.inventoryBannerTitle}>{s.stock_banner_title}</Text>
                            </View>
                            <View style={styles.inventoryItemsList}>
                                {stockItems.map((it, i) => (
                                    <View key={i} style={styles.inventoryItemRow}>
                                        <Text style={styles.inventoryItemName} numberOfLines={1}>{it.name}</Text>
                                        <View style={styles.inventoryItemQty}>
                                            <Ionicons name="cube" size={10} color="#7c3aed" />
                                            <Text style={styles.inventoryItemQtyText}>×{it.inventoryQuantity}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.inventoryTotalsRow}>
                                {totalStockUnits > 0 && (
                                    <View style={styles.inventoryTotalBadge}>
                                        <Text style={styles.inventoryTotalBadgeText}>📦 {totalStockUnits} from stock</Text>
                                    </View>
                                )}
                                {totalMarketUnits > 0 && (
                                    <View style={[styles.inventoryTotalBadge, styles.inventoryMarketBadge]}>
                                        <Text style={[styles.inventoryTotalBadgeText, { color: '#6B7280' }]}>🛒 {totalMarketUnits} from market</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Cash breakdown */}
                    <View style={styles.cashBreakdown}>
                        <Text style={styles.cashBreakdownTitle}>{s.cash_breakdown_title}</Text>
                        <View style={styles.cashBreakdownRows}>
                            {businessPrice > 0 && (
                                <View style={styles.cashRow}>
                                    <View style={styles.cashRowLeft}>
                                        <View style={[styles.cashDot, { backgroundColor: '#EF4444' }]} />
                                        <View>
                                            <Text style={styles.cashRowLabel}>{s.pay_business}</Text>
                                            <Text style={styles.cashRowHint}>{s.pay_business_hint}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cashRowAmount, { color: '#EF4444' }]}>−€{businessPrice.toFixed(2)}</Text>
                                </View>
                            )}
                            <View style={styles.cashRow}>
                                <View style={styles.cashRowLeft}>
                                    <View style={[styles.cashDot, { backgroundColor: '#10B981' }]} />
                                    <View>
                                        <Text style={styles.cashRowLabel}>{s.collect_customer}</Text>
                                        <Text style={styles.cashRowHint}>{s.collect_customer_hint}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.cashRowAmount, { color: '#10B981' }]}>+€{totalPrice.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.cashRow, styles.cashRowLast]}>
                                <View style={styles.cashRowLeft}>
                                    <View style={[styles.cashDot, { backgroundColor: '#6366F1' }]} />
                                    <View>
                                        <Text style={[styles.cashRowLabel, { color: '#6366F1', fontWeight: '700' }]}>{s.your_cut}</Text>
                                        <Text style={styles.cashRowHint}>{s.your_cut_hint}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.cashRowAmount, { color: '#6366F1', fontWeight: '800', fontSize: 16 }]}>€{deliveryFee}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Driver notes */}
                    {!!order.driverNotes && (
                        <View style={styles.notesRow}>
                            <Ionicons name="warning-outline" size={14} color="#D97706" style={{ marginTop: 1 }} />
                            <Text style={styles.notesText}>{order.driverNotes}</Text>
                        </View>
                    )}

                    {/* Primary CTA: Accept */}
                    <Pressable
                        onPress={handleAccept}
                        disabled={accepting}
                        style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
                    >
                        {accepting ? (
                            <ActivityIndicator size={18} color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.acceptText}>{s.accept_order}</Text>
                            </>
                        )}
                    </Pressable>

                    {/* Secondary CTA: Accept & Navigate */}
                    {!!onAcceptAndNavigate && (
                        <Pressable
                            onPress={handleAcceptAndNavigate}
                            disabled={accepting}
                            style={[styles.navBtn, accepting && { opacity: 0.6 }]}
                        >
                            <Ionicons name="navigate-outline" size={16} color="#10B981" />
                            <Text style={styles.navBtnText}>{s.accept_navigate}</Text>
                        </Pressable>
                    )}

                    {/* Skip / Close link */}
                    <Pressable onPress={onSkip} style={styles.skipBtn} disabled={accepting} hitSlop={8}>
                        <Text style={styles.skipText}>{autoCountdown ? s.skip : s.close}</Text>
                    </Pressable>
                </View>

                {/* Drag handle */}
                <View style={styles.handle} />

                {/* “Someone else picked it” overlay */}
                {takenByOther && (
                    <View style={styles.takenOverlay}>
                        <View style={styles.takenIconWrap}>
                            <Ionicons name="flash" size={28} color="#fbbf24" />
                        </View>
                        <Text style={styles.takenTitle}>{s.order_taken}</Text>
                        <Text style={styles.takenSub}>{s.taken_sub}</Text>
                        <View style={styles.takenDivider} />
                        <Text style={styles.takenHint}>{s.taken_hint}</Text>
                    </View>
                )}
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
        zIndex: 300,
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 24,
    },
    dragBody: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 4,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    headerTextBlock: {
        flex: 1,
    },
    headerLabel: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    bizName: {
        color: '#111827',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    ringContainer: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    countdownText: {
        position: 'absolute',
        color: '#374151',
        fontSize: 14,
        fontWeight: '800',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    infoItem: {
        alignItems: 'center',
        gap: 2,
    },
    infoValue: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },
    infoLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    infoDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
    },
    itemsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FAFAFA',
    },
    itemsToggleOpen: {
        borderColor: '#D1D5DB',
        backgroundColor: '#F3F4F6',
    },
    itemsToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    itemsToggleText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '600',
    },
    itemsList: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemName: {
        color: '#374151',
        fontSize: 13,
        flex: 1,
    },
    itemQtyBadge: {
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginLeft: 10,
    },
    itemQtyText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '700',
    },
    itemsMore: {
        color: '#9CA3AF',
        fontSize: 11,
        paddingVertical: 6,
        textAlign: 'center',
    },

    /* -- Inventory banner -- */
    inventoryBanner: {
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd6fe',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    inventoryBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    inventoryBannerTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7c3aed',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    inventoryItemsList: {
        gap: 4,
        marginBottom: 8,
    },
    inventoryItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inventoryItemName: {
        fontSize: 13,
        color: '#374151',
        flex: 1,
    },
    inventoryItemQty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(124,58,237,0.12)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    inventoryItemQtyText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7c3aed',
    },
    inventoryTotalsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    inventoryTotalBadge: {
        backgroundColor: 'rgba(124,58,237,0.1)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    inventoryMarketBadge: {
        backgroundColor: '#F3F4F6',
    },
    inventoryTotalBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7c3aed',
    },

    /* -- Cash breakdown -- */
    cashBreakdown: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    cashBreakdownTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    cashBreakdownRows: {
        gap: 6,
    },
    cashRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cashRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
        paddingTop: 4,
    },
    cashRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    cashDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    cashRowLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    cashRowHint: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 1,
    },
    cashRowAmount: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },

    notesRow: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    notesText: {
        color: '#92400E',
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    acceptBtn: {
        height: 52,
        borderRadius: 14,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    acceptText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    navBtn: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
        backgroundColor: 'transparent',
    },
    navBtnText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '700',
    },
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 2,
    },
    skipText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500',
    },
    takenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 10, 18, 0.96)',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 10,
        paddingHorizontal: 32,
    },
    takenIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(251,191,36,0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(251,191,36,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    takenTitle: {
        color: '#fbbf24',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    takenSub: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 2,
    },
    takenDivider: {
        width: 40,
        height: 2,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 10,
    },
    takenHint: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '500',
    },
});
