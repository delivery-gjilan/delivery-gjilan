import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const DD_ORANGE = '#F97316';
const DD_ORANGE_DARK = '#ea6500';
const DD_ORANGE_BG = 'rgba(249,115,22,0.08)';
const DD_ORANGE_BORDER = 'rgba(249,115,22,0.30)';

type InspectMode = 'available' | 'assigned';

interface Props {
    mode: InspectMode;
    order: DriverOrder;
    onClose: () => void;
    onAccept?: (orderId: string) => void;
    onAcceptAndNavigate?: (orderId: string) => void;
    onNavigate?: () => void;
    onMarkPickedUp?: () => Promise<void> | void;
    accepting?: boolean;
    autoCountdown?: boolean;
    onHeightChange?: (h: number) => void;
    takenByOther?: boolean;
    routeInfo?: { distanceKm: number; durationMin: number } | null;
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    PREPARING: '#F97316',
    READY: '#22C55E',
    OUT_FOR_DELIVERY: '#3B82F6',
};

export function OrderInspectSheet({
    mode,
    order,
    onClose,
    onAccept,
    onAcceptAndNavigate,
    onNavigate,
    onMarkPickedUp,
    accepting = false,
    autoCountdown = true,
    onHeightChange,
    takenByOther = false,
    routeInfo: externalRouteInfo = null,
}: Props) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const s = t.orderAccept;
    const slideY = useRef(new Animated.Value(-500)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
    const [markingPickedUp, setMarkingPickedUp] = useState(false);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const [fallbackRouteInfo, setFallbackRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    const isAvailable = mode === 'available';
    const isAssigned = mode === 'assigned';
    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const recipientLabel = order.recipientName ?? order.recipientPhone ?? null;
    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const allItems = (order.businesses ?? []).flatMap((b) => b.items ?? []);
    const itemCount = allItems.length;
    const totalStockUnits = allItems.reduce((sum, it) => sum + (it.inventoryQuantity ?? 0), 0);
    const totalMarketUnits = allItems.reduce((sum, it) => sum + Math.max(0, it.quantity - (it.inventoryQuantity ?? 0)), 0);
    const hasInventory = totalStockUnits > 0;
    const orderPrice = Number((order as any).orderPrice ?? 0);
    const inventoryPrice = Number((order as any).inventoryPrice ?? 0);
    const businessPrice = Math.max(0, orderPrice - inventoryPrice);
    const totalPrice = Number(order.totalPrice ?? 0);
    const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);
    const dropAddress = order.dropOffLocation?.address ?? '';
    const shortAddress = dropAddress.split(',')[0] || s.see_map;
    const cashToCollect = Number((order as any).cashToCollect ?? 0);
    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';

    const ringColor = isDirectDispatch ? DD_ORANGE : countdown <= 5 ? '#EF4444' : '#10B981';
    const ringOffset = (RING_C * (COUNTDOWN_DURATION - countdown)) / COUNTDOWN_DURATION;
    const cashCopy = {
        payBusiness: 'Pay business',
        payBusinessHint: 'Market items you buy on-site',
        collectCustomer: 'Collect from customer',
        collectCustomerHint: 'Total cash to collect',
        yourCut: 'Your cut',
        yourCutHint: 'Delivery fee you keep',
    };

    const etaLabel = (() => {
        if (order.status === 'READY') return isAssigned ? 'Ready for pickup' : s.ready_now;
        if (order.estimatedReadyAt) {
            const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - nowTs) / 60_000);
            if (diff > 0) return isAssigned ? `Ready in ${diff} min` : s.ready_in.replace('{{min}}', String(diff));
            return isAssigned ? 'Almost ready' : s.almost_ready;
        }
        if (order.status === 'OUT_FOR_DELIVERY') return 'On the way';
        if (order.status === 'PREPARING') return isAssigned ? 'Preparing' : s.preparing;
        return statusLabel;
    })();

    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        setFallbackRouteInfo(null);
        if (externalRouteInfo) return;
        const bizLoc = order?.businesses?.[0]?.business?.location;
        const dropLoc = order?.dropOffLocation;
        if (!bizLoc?.latitude || !dropLoc?.latitude) return;
        let cancelled = false;
        calculateRouteDistance(
            { latitude: Number(bizLoc.latitude), longitude: Number(bizLoc.longitude) },
            { latitude: Number(dropLoc.latitude), longitude: Number(dropLoc.longitude) },
        ).then((result) => {
            if (!cancelled && result) setFallbackRouteInfo(result);
        });
        return () => {
            cancelled = true;
        };
    }, [externalRouteInfo, order?.id]);

    const routeInfo = externalRouteInfo ?? fallbackRouteInfo;

    useEffect(() => {
        slideY.setValue(-500);
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 85,
            friction: 16,
        }).start();
    }, [order?.id]);

    useEffect(() => {
        if (!isAvailable || !autoCountdown) {
            setCountdown(COUNTDOWN_DURATION);
            return;
        }

        setCountdown(COUNTDOWN_DURATION);
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [autoCountdown, isAvailable, onClose, order?.id]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => gs.dy < -6 && Math.abs(gs.dy) > Math.abs(gs.dx),
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

    const handleAccept = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAccept?.(order.id);
    }, [onAccept, order.id]);

    const handleAcceptAndNavigate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onAcceptAndNavigate?.(order.id);
    }, [onAcceptAndNavigate, order.id]);

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

    // Calculate net earnings (after business payment deduction)
    const driverTip = Number(order.driverTip ?? 0);
    const grossEarnings = Number(deliveryFee) + driverTip;
    const netEarnings = Math.max(0, grossEarnings - businessPrice);

    const primaryAction = useMemo(() => {
        if (isAvailable) {
            return {
                label: isDirectDispatch ? 'Accept Call' : s.accept_order,
                icon: isDirectDispatch ? 'call' : 'checkmark-circle',
                onPress: handleAccept,
                style: [styles.primaryBtn, isDirectDispatch && styles.primaryBtnDD],
                textStyle: styles.primaryBtnText,
                loading: accepting,
            };
        }

        return {
            label: (!isDirectDispatch && order.status === 'OUT_FOR_DELIVERY') ? 'Continue to drop-off' : 'Continue to pickup',
            icon: 'navigate-outline',
            onPress: () => onNavigate?.(),
            style: [styles.primaryBtn, styles.primaryBtnAssigned],
            textStyle: styles.primaryBtnText,
            loading: false,
        };
    }, [accepting, handleAccept, isAvailable, isDirectDispatch, onNavigate, order.status, s.accept_order]);

    const secondaryAction = useMemo(() => {
        if (isAvailable && onAcceptAndNavigate) {
            return {
                label: s.accept_navigate,
                icon: 'navigate-outline',
                onPress: handleAcceptAndNavigate,
                style: [styles.secondaryBtn, isDirectDispatch && styles.secondaryBtnDD],
                textStyle: [styles.secondaryBtnText, isDirectDispatch && { color: DD_ORANGE }],
                loading: accepting,
            };
        }

        if (isAssigned && order.status === 'READY' && onMarkPickedUp) {
            return {
                label: 'Mark Picked Up',
                icon: 'checkmark-circle',
                onPress: handleMarkPickedUp,
                style: [styles.secondaryAssignedBtn],
                textStyle: styles.secondaryAssignedBtnText,
                loading: markingPickedUp,
            };
        }

        return null;
    }, [accepting, handleAcceptAndNavigate, handleMarkPickedUp, isAssigned, isAvailable, isDirectDispatch, markingPickedUp, onAcceptAndNavigate, onMarkPickedUp, order.status, s.accept_navigate]);

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View
                style={[styles.sheet, isDirectDispatch && styles.sheetDD, { paddingTop: insets.top + (isDirectDispatch ? 0 : 8) }]}
                onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
            >
                {isDirectDispatch && <View style={styles.ddAccentBar} />}

                {isDirectDispatch && (
                    <View style={styles.ddBanner}>
                        <Ionicons name="call" size={13} color={DD_ORANGE} />
                        <Text style={styles.ddBannerLabel}>DIRECT CALL</Text>
                        {recipientLabel ? <Text style={styles.ddBannerRecipient} numberOfLines={1}>· {recipientLabel}</Text> : null}
                    </View>
                )}

                <View {...panResponder.panHandlers} style={[styles.body, isDirectDispatch && { paddingTop: 10 }]}>
                    <View style={styles.headerRow}>
                        {isAvailable && autoCountdown ? (
                            <View style={styles.ringContainer}>
                                <Svg width={52} height={52} viewBox="0 0 52 52">
                                    <Circle cx={26} cy={26} r={RING_R} stroke={isDirectDispatch ? 'rgba(249,115,22,0.18)' : '#E5E7EB'} strokeWidth={3.5} fill="none" />
                                    <Circle
                                        cx={26}
                                        cy={26}
                                        r={RING_R}
                                        stroke={ringColor}
                                        strokeWidth={3.5}
                                        fill="none"
                                        strokeDasharray={`${RING_C} ${RING_C}`}
                                        strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                        rotation="-90"
                                        origin="26, 26"
                                    />
                                </Svg>
                                <Text style={[styles.countdownText, { color: ringColor }]}>{countdown}</Text>
                            </View>
                        ) : (
                            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
                                <Text style={[styles.statusBadgeText, { color: isDirectDispatch && isAssigned ? DD_ORANGE : statusColor }]}>
                                    {isAssigned ? statusLabel : 'Available'}
                                </Text>
                            </View>
                        )}

                        <View style={styles.headerTextBlock}>
                            <Text style={[styles.headerLabel, isDirectDispatch && { color: DD_ORANGE }]}>
                                {isAvailable ? (isDirectDispatch ? 'NEW CALL' : s.new_order) : 'ORDER DETAILS'}
                            </Text>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
                            {!isDirectDispatch && recipientLabel ? (
                                <Text style={styles.recipientText} numberOfLines={1}>{recipientLabel}</Text>
                            ) : null}
                        </View>

                        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                            <Ionicons name="close" size={16} color="#6B7280" />
                        </Pressable>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Order Summary</Text>
                    </View>
                    <View style={[styles.infoRow, isDirectDispatch && styles.infoRowDD]}>
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoValue, isDirectDispatch && { color: DD_ORANGE, fontWeight: '800' }]}>€{deliveryFee}</Text>
                            <Text style={styles.infoLabel}>{isDirectDispatch ? 'Agreed fee' : s.you_earn}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoValue, order.status === 'READY' && { color: '#10B981' }]}>{etaLabel}</Text>
                            <Text style={styles.infoLabel}>{isAvailable ? s.food_status : 'Status'}</Text>
                        </View>
                        {routeInfo ? (
                            <>
                                <View style={styles.infoDivider} />
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoValue}>{routeInfo.distanceKm.toFixed(1)} km</Text>
                                    <Text style={styles.infoLabel}>Total route</Text>
                                </View>
                            </>
                        ) : null}
                        <View style={styles.infoDivider} />
                        <View style={[styles.infoItem, { flex: 1 }]}> 
                            <Text style={styles.infoValue} numberOfLines={1}>{isDirectDispatch ? 'Given at pickup' : shortAddress}</Text>
                            <Text style={styles.infoLabel}>{s.dropoff}</Text>
                        </View>
                    </View>

                    {allItems.length > 0 && (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Pickup Plan</Text>
                            </View>
                            <View style={styles.itemsSection}>
                                <View style={styles.itemsSectionHeader}>
                                    <Ionicons name="bag-handle-outline" size={13} color="#6B7280" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemsSectionTitle}>{itemCount} {itemCount === 1 ? s.item : s.items}</Text>
                                        <Text style={styles.itemsSectionSubtitle}>
                                            {hasInventory
                                                ? `Collect ${totalStockUnits} from your stock and ${totalMarketUnits} from the business.`
                                                : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} to collect at the business.`}
                                        </Text>
                                    </View>
                                </View>
                                {allItems.slice(0, 8).map((item, idx: number) => {
                                    const fromStock = item.inventoryQuantity ?? 0;
                                    const fromMarket = Math.max(0, item.quantity - fromStock);
                                    return (
                                        <View key={idx} style={[styles.itemRow, idx < Math.min(allItems.length, 8) - 1 && styles.itemRowBorder]}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <View style={styles.itemBadges}>
                                                {fromStock > 0 && (
                                                    <View style={styles.stockTag}>
                                                        <Ionicons name="cube" size={9} color="#7c3aed" />
                                                        <Text style={styles.stockTagText}>×{fromStock}</Text>
                                                    </View>
                                                )}
                                                {fromMarket > 0 && (
                                                    <View style={styles.marketTag}>
                                                        <Ionicons name="storefront-outline" size={9} color="#0369a1" />
                                                        <Text style={styles.marketTagText}>×{fromMarket}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                                {allItems.length > 8 && <Text style={styles.itemsMore}>+{allItems.length - 8} more items</Text>}
                            </View>
                        </>
                    )}

                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Your Earnings</Text>
                    </View>
                    <View style={styles.cashBreakdown}>
                        <View style={styles.cashRows}>
                            {/* Delivery Fee */}
                            <View style={styles.cashRow}>
                                <View style={styles.cashRowLeft}>
                                    <View style={[styles.cashDot, { backgroundColor: '#3B82F6' }]} />
                                    <View>
                                        <Text style={styles.cashRowLabel}>Delivery Fee</Text>
                                        <Text style={styles.cashRowHint}>Your compensation for delivery</Text>
                                    </View>
                                </View>
                                <Text style={[styles.cashRowAmount, { color: '#3B82F6' }]}>+€{Number(deliveryFee).toFixed(2)}</Text>
                            </View>

                            {/* Tip (if any) */}
                            {driverTip > 0 && (
                                <View style={styles.cashRow}>
                                    <View style={styles.cashRowLeft}>
                                        <View style={[styles.cashDot, { backgroundColor: '#EC4899' }]} />
                                        <View>
                                            <Text style={styles.cashRowLabel}>Tip</Text>
                                            <Text style={styles.cashRowHint}>Customer appreciation</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cashRowAmount, { color: '#EC4899' }]}>+€{driverTip.toFixed(2)}</Text>
                                </View>
                            )}

                            {/* Subtotal earnings */}
                            {(businessPrice > 0 || !isDirectDispatch) && (
                                <View style={styles.cashRow}>
                                    <View style={styles.cashRowLeft}>
                                        <View style={[styles.cashDot, { backgroundColor: '#9CA3AF' }]} />
                                        <View>
                                            <Text style={styles.cashRowLabel}>Subtotal</Text>
                                            <Text style={styles.cashRowHint}>Before deductions</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cashRowAmount, { color: '#6B7280', fontWeight: '600' }]}>€{grossEarnings.toFixed(2)}</Text>
                                </View>
                            )}

                            {/* Business Payment Deduction (Market Items) */}
                            {!isDirectDispatch && businessPrice > 0 && (
                                <View style={styles.cashRow}>
                                    <View style={styles.cashRowLeft}>
                                        <View style={[styles.cashDot, { backgroundColor: '#EF4444' }]} />
                                        <View>
                                            <Text style={[styles.cashRowLabel, { fontWeight: '700' }]}>Pay Business</Text>
                                            <Text style={styles.cashRowHint}>Market items you source on-site</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cashRowAmount, { color: '#EF4444', fontWeight: '700' }]}>−€{businessPrice.toFixed(2)}</Text>
                                </View>
                            )}

                            {/* NET EARNINGS - HIGHLIGHTED */}
                            <View style={[styles.cashRow, styles.cashRowLast, styles.netEarningsRow]}>
                                <View style={styles.cashRowLeft}>
                                    <View style={[styles.cashDot, { backgroundColor: '#22C55E' }]} />
                                    <View>
                                        <Text style={[styles.cashRowLabel, styles.netEarningsLabel]}>You Keep</Text>
                                        <Text style={styles.cashRowHint}>Your final payout</Text>
                                    </View>
                                </View>
                                <Text style={[styles.cashRowAmount, styles.netEarningsAmount]}>€{netEarnings.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Customer Collection Section (separate from earnings) */}
                    {!isDirectDispatch && (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Cash From Customer</Text>
                            </View>
                            <View style={styles.cashBreakdown}>
                                <View style={styles.cashRows}>
                                    <View style={[styles.cashRow, styles.cashRowLast]}>
                                        <View style={styles.cashRowLeft}>
                                            <View style={[styles.cashDot, { backgroundColor: '#10B981' }]} />
                                            <View>
                                                <Text style={styles.cashRowLabel}>{cashCopy.collectCustomer}</Text>
                                                <Text style={styles.cashRowHint}>{cashCopy.collectCustomerHint}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.cashRowAmount, { color: '#10B981' }]}>+€{totalPrice.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Direct Dispatch Cash Section */}
                    {isDirectDispatch && (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Cash From Customer</Text>
                            </View>
                            <View style={styles.cashBreakdown}>
                                <View style={styles.cashRows}>
                                    {cashToCollect > 0 ? (
                                        <View style={[styles.cashRow, styles.cashRowLast]}>
                                            <View style={styles.cashRowLeft}>
                                                <View style={[styles.cashDot, { backgroundColor: '#10B981' }]} />
                                                <View>
                                                    <Text style={styles.cashRowLabel}>Collect from customer</Text>
                                                    <Text style={styles.cashRowHint}>Cash to collect on delivery</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.cashRowAmount, { color: '#10B981' }]}>+€{cashToCollect.toFixed(2)}</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.cashRow, styles.cashRowLast]}>
                                            <View style={styles.cashRowLeft}>
                                                <View style={[styles.cashDot, { backgroundColor: '#9CA3AF' }]} />
                                                <View>
                                                    <Text style={styles.cashRowLabel}>Collect from customer</Text>
                                                    <Text style={styles.cashRowHint}>Confirm amount with business</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </>
                    )}

                    {!!order.driverNotes && (
                        <View style={styles.notesRow}>
                            <Ionicons name="warning-outline" size={14} color="#D97706" style={{ marginTop: 1 }} />
                            <Text style={styles.notesText}>{order.driverNotes}</Text>
                        </View>
                    )}

                    <View style={styles.actionsRow}>
                        <Pressable onPress={primaryAction.onPress} disabled={primaryAction.loading || markingPickedUp} style={[...primaryAction.style, (primaryAction.loading || markingPickedUp) && { opacity: 0.6 }]}>
                            {primaryAction.loading ? (
                                <ActivityIndicator size={18} color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name={primaryAction.icon as any} size={20} color="#fff" />
                                    <Text style={primaryAction.textStyle}>{primaryAction.label}</Text>
                                </>
                            )}
                        </Pressable>

                        {secondaryAction && (
                            <Pressable onPress={secondaryAction.onPress} disabled={secondaryAction.loading || accepting} style={[...secondaryAction.style, (secondaryAction.loading || accepting) && { opacity: 0.6 }]}>
                                {secondaryAction.loading ? (
                                    <ActivityIndicator size={18} color={isAssigned ? '#fff' : isDirectDispatch ? DD_ORANGE : '#10B981'} />
                                ) : (
                                    <>
                                        <Ionicons name={secondaryAction.icon as any} size={16} color={isAssigned ? '#fff' : isDirectDispatch ? DD_ORANGE : '#10B981'} />
                                        <Text style={secondaryAction.textStyle}>{secondaryAction.label}</Text>
                                    </>
                                )}
                            </Pressable>
                        )}
                    </View>

                    <Pressable onPress={onClose} style={styles.closeLink} disabled={accepting || markingPickedUp} hitSlop={8}>
                        <Text style={styles.closeLinkText}>{isAvailable && autoCountdown ? s.skip : s.close}</Text>
                    </Pressable>
                </View>

                <View style={styles.handle} />

                {isAvailable && takenByOther && (
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
    sheetDD: {
        shadowColor: DD_ORANGE,
        shadowOpacity: 0.25,
        shadowRadius: 26,
        elevation: 30,
    },
    ddAccentBar: {
        height: 4,
        backgroundColor: DD_ORANGE,
    },
    ddBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: DD_ORANGE_BG,
        borderBottomWidth: 1,
        borderBottomColor: DD_ORANGE_BORDER,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    ddBannerLabel: {
        color: DD_ORANGE,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    ddBannerRecipient: {
        color: DD_ORANGE_DARK,
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 4,
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
        fontWeight: '700',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    bizName: {
        color: '#111827',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    recipientText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        fontSize: 14,
        fontWeight: '800',
    },
    statusBadge: {
        minWidth: 78,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sectionHeaderRow: {
        marginBottom: 6,
    },
    sectionTitle: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
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
    infoRowDD: {
        backgroundColor: 'rgba(249,115,22,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(249,115,22,0.16)',
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
    itemsSection: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
        marginBottom: 8,
    },
    itemsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    itemsSectionTitle: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    itemsSectionSubtitle: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemName: {
        color: '#374151',
        fontSize: 13,
        flex: 1,
        marginRight: 8,
    },
    itemBadges: {
        flexDirection: 'row',
        gap: 4,
    },
    stockTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(124,58,237,0.12)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    stockTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7c3aed',
    },
    marketTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#e0f2fe',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    marketTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0369a1',
    },
    itemsMore: {
        color: '#9CA3AF',
        fontSize: 11,
        paddingVertical: 6,
        textAlign: 'center',
    },
    cashBreakdown: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    cashRows: {
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
    cashCutAmount: {
        color: '#6366F1',
        fontWeight: '900',
        fontSize: 20,
        letterSpacing: -0.5,
    },
    netEarningsRow: {
        backgroundColor: '#F0FDF4',
        borderTopWidth: 1,
        borderTopColor: '#D1FAE5',
        paddingTop: 10,
    },
    netEarningsLabel: {
        color: '#15803D',
        fontWeight: '800',
    },
    netEarningsAmount: {
        color: '#22C55E',
        fontWeight: '900',
        fontSize: 24,
        letterSpacing: -0.6,
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
    actionsRow: {
        gap: 8,
    },
    primaryBtn: {
        height: 52,
        borderRadius: 14,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    primaryBtnDD: {
        backgroundColor: DD_ORANGE,
        shadowColor: DD_ORANGE,
    },
    primaryBtnAssigned: {
        backgroundColor: '#4F46E5',
        shadowColor: '#4F46E5',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: 'rgba(16,185,129,0.06)',
    },
    secondaryBtnDD: {
        borderColor: DD_ORANGE_BORDER,
        backgroundColor: 'rgba(249,115,22,0.06)',
    },
    secondaryBtnText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryAssignedBtn: {
        height: 44,
        borderRadius: 12,
        backgroundColor: '#16A34A',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    secondaryAssignedBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    closeLink: {
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 2,
    },
    closeLinkText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500',
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
