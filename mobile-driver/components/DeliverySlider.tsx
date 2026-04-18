import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, PanResponder, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '@/hooks/useTranslations';
import type { DriverOrder } from '@/utils/types';

const THUMB = 56;
const TRACK_H = 66;
const PING_UNLOCK_S = 180;   // 3 min after I'm Here
const CANCEL_UNLOCK_S = 600; // 10 min after arrival

interface Props {
    order: DriverOrder | null;
    customerName: string;
    customerPhone: string | null;
    arrivedNotifSent: boolean;
    arrivedAt: number;
    notifiedAt: number | null;
    customerPaymentAmount: number | null;
    insetBottom: number;
    onNotify: () => void;
    onPingAgain: () => void;
    onConfirm: () => Promise<void>;
    onCancel: (reason: string) => void;
    onDismiss?: () => void;
    onSuccessAnimStart?: () => void;
}

export function DeliverySlider({
    order,
    customerName,
    customerPhone,
    arrivedNotifSent,
    arrivedAt,
    notifiedAt,
    customerPaymentAmount,
    insetBottom,
    onNotify,
    onPingAgain,
    onConfirm,
    onCancel,
    onDismiss,
    onSuccessAnimStart,
}: Props) {
    const { t } = useTranslations();
    const s = t.delivery;
    const CANCEL_REASONS = [
        { key: 'NOT_RESPONDING', label: s.reason_not_responding },
        { key: 'WRONG_ADDRESS', label: s.reason_wrong_address },
        { key: 'REFUSED', label: s.reason_refused },
        { key: 'SAFETY', label: s.reason_safety },
        { key: 'OTHER', label: s.reason_other },
    ];
    const trackWidth = useRef(0);
    const cancelTrackWidth = useRef(0);
    const translateX = useRef(new Animated.Value(0)).current;
    const cancelTranslateX = useRef(new Animated.Value(0)).current;
    const confirmed = useRef(false);
    const cancelConfirmed = useRef(false);
    const [done, setDone] = useState(false);
    const [showCancelSheet, setShowCancelSheet] = useState(false);
    const [selectedReason, setSelectedReason] = useState<{ key: string; label: string } | null>(null);

    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const elapsedSinceArrival = Math.floor((Date.now() - arrivedAt) / 1000);
    const elapsedSinceNotif   = notifiedAt ? Math.floor((Date.now() - notifiedAt) / 1000) : 0;
    const pingUnlocked   = arrivedNotifSent && elapsedSinceNotif >= PING_UNLOCK_S;
    const cancelUnlocked = elapsedSinceArrival >= CANCEL_UNLOCK_S;
    const pingRemaining   = arrivedNotifSent ? Math.max(0, PING_UNLOCK_S - elapsedSinceNotif) : PING_UNLOCK_S;
    const cancelRemaining = Math.max(0, CANCEL_UNLOCK_S - elapsedSinceArrival);
    const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const breakdownItems = useMemo(
        () => (order?.businesses ?? []).flatMap((b) => b.items.map((item) => ({
            id: `${b.business.id}-${item.name}-${item.quantity}`,
            name: item.name,
            quantity: item.quantity,
        }))),
        [order],
    );
    const subtotal = Number(order?.orderPrice ?? 0);
    const deliveryFee = Number(order?.deliveryPrice ?? 0);
    const orderTotal = Number(order?.totalPrice ?? customerPaymentAmount ?? 0);

    const successOpacity = useRef(new Animated.Value(0)).current;
    const successScale   = useRef(new Animated.Value(0.4)).current;
    const fillOpacity    = translateX.interpolate({ inputRange: [0, 200], outputRange: [0, 1], extrapolate: 'clamp' });
    const labelOpacity   = translateX.interpolate({ inputRange: [0, 80],  outputRange: [1, 0], extrapolate: 'clamp' });

    const cancelFillOpacity  = cancelTranslateX.interpolate({ inputRange: [0, 200], outputRange: [0, 1], extrapolate: 'clamp' });
    const cancelLabelOpacity = cancelTranslateX.interpolate({ inputRange: [0, 80],  outputRange: [1, 0], extrapolate: 'clamp' });

    const runSuccess = useCallback(async () => {
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccessAnimStart?.();
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        await new Promise<void>(resolve => setTimeout(resolve, 3200));
        await onConfirm();
    }, [onConfirm, onSuccessAnimStart, successOpacity]);

    const deliveryPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !confirmed.current,
            onPanResponderMove: (_, gs) => {
                const max = trackWidth.current - THUMB - 6;
                translateX.setValue(Math.max(0, Math.min(gs.dx, max)));
            },
            onPanResponderRelease: (_, gs) => {
                const max = trackWidth.current - THUMB - 6;
                if (gs.dx >= max * 0.82 && !confirmed.current) {
                    confirmed.current = true;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    Animated.timing(translateX, { toValue: max, duration: 120, useNativeDriver: true })
                        .start(() => runSuccess());
                } else {
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }),
    ).current;

    const cancelPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !!selectedReason && !cancelConfirmed.current,
            onPanResponderMove: (_, gs) => {
                if (!selectedReason) return;
                const max = cancelTrackWidth.current - THUMB - 6;
                cancelTranslateX.setValue(Math.max(0, Math.min(gs.dx, max)));
            },
            onPanResponderRelease: (_, gs) => {
                const max = cancelTrackWidth.current - THUMB - 6;
                if (gs.dx >= max * 0.82 && selectedReason && !cancelConfirmed.current) {
                    cancelConfirmed.current = true;
                    Animated.timing(cancelTranslateX, { toValue: max, duration: 120, useNativeDriver: true })
                        .start(() => onCancel(selectedReason.key));
                } else {
                    Animated.spring(cancelTranslateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }),
    ).current;

    const bottomPad = insetBottom + 24;

    return (
        <View style={styles.panel}>
            {!done && (
                !showCancelSheet ? (
                    <>
                        <View style={styles.handle} />

                        {/* ── Header row ── */}
                        <View style={styles.header}>
                            <View style={styles.iconRing}>
                                <Ionicons name="location" size={20} color="#22c55e" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{s.arrived_at_dropoff}</Text>
                                <Text style={styles.sub} numberOfLines={1}>{customerName}</Text>
                            </View>
                            <Pressable
                                style={[styles.callBtn, !customerPhone && { opacity: 0.3 }]}
                                onPress={() => customerPhone && Linking.openURL(`tel:${customerPhone}`)}
                                disabled={!customerPhone}
                                hitSlop={8}
                            >
                                <Ionicons name="call" size={16} color="#22d3ee" />
                            </Pressable>
                            {onDismiss && (
                                <Pressable style={styles.dismissBtn} onPress={onDismiss} hitSlop={10}>
                                    <Ionicons name="close" size={18} color="#64748b" />
                                </Pressable>
                            )}
                        </View>

                        {/* ── Notify customer pill ── */}
                        <Pressable
                            style={[styles.notifBtn, arrivedNotifSent && styles.notifBtnSent]}
                            disabled={arrivedNotifSent}
                            onPress={onNotify}
                        >
                            <Ionicons
                                name={arrivedNotifSent ? 'checkmark-circle' : 'notifications'}
                                size={17}
                                color={arrivedNotifSent ? '#22c55e' : '#f1f5f9'}
                            />
                            <Text style={[styles.notifText, arrivedNotifSent && { color: '#22c55e' }]}>
                                {arrivedNotifSent ? s.notified : s.im_here}
                            </Text>
                            {!arrivedNotifSent && (
                                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto' }} />
                            )}
                        </Pressable>

                        {/* ── Scrollable body ── */}
                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {/* Collect card */}
                            <View style={styles.collectCard}>
                                <View style={styles.collectLeft}>
                                    <Ionicons name="cash" size={18} color="#4ade80" />
                                    <Text style={styles.collectLabel}>Collect from customer</Text>
                                </View>
                                <Text style={styles.collectAmount}>
                                    {customerPaymentAmount != null ? `€${customerPaymentAmount.toFixed(2)}` : '—'}
                                </Text>
                            </View>

                            {/* Order breakdown */}
                            {!!order && (
                                <View style={styles.breakdownCard}>
                                    <Text style={styles.breakdownHeader}>Order contents</Text>
                                    {breakdownItems.map((item) => (
                                        <View key={item.id} style={styles.itemRow}>
                                            <View style={styles.itemQtyBadge}>
                                                <Text style={styles.itemQtyText}>{item.quantity}×</Text>
                                            </View>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                        </View>
                                    ))}

                                    <View style={styles.pricingDivider} />

                                    <View style={styles.pricingRow}>
                                        <Text style={styles.pricingLabel}>{s.subtotal}</Text>
                                        <Text style={styles.pricingValue}>€{subtotal.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.pricingRow}>
                                        <Text style={styles.pricingLabel}>{s.delivery_fee}</Text>
                                        <Text style={styles.pricingValue}>€{deliveryFee.toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.pricingRow, styles.pricingTotalRow]}>
                                        <Text style={styles.pricingTotalLabel}>{s.total}</Text>
                                        <Text style={styles.pricingTotalValue}>€{orderTotal.toFixed(2)}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Ping / cancel action row */}
                            <View style={styles.actionRow}>
                                <Pressable
                                    style={[styles.actionBtn, styles.pingBtn, !pingUnlocked && { opacity: 0.38 }]}
                                    disabled={!pingUnlocked}
                                    onPress={onPingAgain}
                                >
                                    <Ionicons name="radio-button-on" size={15} color="#06b6d4" />
                                    <Text style={[styles.actionBtnText, { color: '#06b6d4' }]}>
                                        {pingUnlocked ? s.ping_again : fmtTime(pingRemaining)}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.actionBtn, styles.cancelActionBtn, !cancelUnlocked && { opacity: 0.38 }]}
                                    disabled={!cancelUnlocked}
                                    onPress={() => setShowCancelSheet(true)}
                                >
                                    <Ionicons name="close-circle-outline" size={15} color="#f87171" />
                                    <Text style={[styles.actionBtnText, { color: '#f87171' }]}>
                                        {cancelUnlocked ? s.cancel_order : fmtTime(cancelRemaining)}
                                    </Text>
                                </Pressable>
                            </View>
                        </ScrollView>

                        {/* ── Confirmation slider (pinned above home indicator) ── */}
                        <View style={[styles.sliderWrapper, { paddingBottom: bottomPad }]}>
                            <Text style={styles.sliderHint}>Slide to confirm delivery</Text>
                            <View
                                style={styles.track}
                                onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
                            >
                                <Animated.View style={[styles.fill, { opacity: fillOpacity }]} />
                                <Animated.Text style={[styles.trackLabel, { opacity: labelOpacity }]}>
                                    {s.slide_confirm}
                                </Animated.Text>
                                <Animated.View
                                    style={[styles.thumb, { transform: [{ translateX }] }]}
                                    {...deliveryPan.panHandlers}
                                >
                                    <Ionicons name="checkmark" size={26} color="#fff" />
                                </Animated.View>
                            </View>
                        </View>
                    </>
                ) : (
                    /* ── Cancel sheet ── */
                    <>
                        <View style={styles.handle} />
                        <View style={styles.cancelHeader}>
                            <Pressable onPress={() => setShowCancelSheet(false)} hitSlop={10}>
                                <Ionicons name="arrow-back" size={20} color="#94a3b8" />
                            </Pressable>
                            <Text style={styles.cancelTitle}>{s.cancel_order}</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={styles.cancelSubtitle}>{s.select_reason}</Text>
                        <View style={styles.reasonList}>
                            {CANCEL_REASONS.map((r) => (
                                <Pressable
                                    key={r.key}
                                    style={[styles.reasonRow, selectedReason?.key === r.key && styles.reasonRowSelected]}
                                    onPress={() => setSelectedReason(r)}
                                >
                                    <View style={[styles.reasonDot, selectedReason?.key === r.key && styles.reasonDotSelected]} />
                                    <Text style={[styles.reasonText, selectedReason?.key === r.key && { color: '#f1f5f9' }]}>
                                        {r.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={{ paddingBottom: bottomPad }}>
                            <View
                                style={[styles.track, styles.cancelTrack, !selectedReason && { opacity: 0.35 }]}
                                onLayout={(e) => { cancelTrackWidth.current = e.nativeEvent.layout.width; }}
                            >
                                <Animated.View style={[styles.fill, styles.cancelFill, { opacity: cancelFillOpacity }]} />
                                <Animated.Text style={[styles.trackLabel, { opacity: cancelLabelOpacity }]}>
                                    {selectedReason ? s.slide_cancel : s.select_reason_first}
                                </Animated.Text>
                                <Animated.View
                                    style={[styles.thumb, styles.cancelThumb, { transform: [{ translateX: cancelTranslateX }] }]}
                                    {...(selectedReason ? cancelPan.panHandlers : {})}
                                >
                                    <Ionicons name="close" size={22} color="#fff" />
                                </Animated.View>
                            </View>
                        </View>
                    </>
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0a0f1a',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 20,
        paddingTop: 10,
        maxHeight: '82%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
        elevation: 24,
        zIndex: 120,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    iconRing: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#f1f5f9',
        fontSize: 15,
        fontWeight: '800',
    },
    sub: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 1,
    },
    callBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(34,211,238,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 14,
    },
    notifBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    notifText: {
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    body: {
        flexShrink: 1,
    },
    collectCard: {
        backgroundColor: 'rgba(74,222,128,0.09)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.25)',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    collectLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    collectLabel: {
        color: '#86efac',
        fontSize: 13,
        fontWeight: '700',
    },
    collectAmount: {
        color: '#4ade80',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    breakdownCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 8,
    },
    breakdownHeader: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    itemQtyBadge: {
        width: 28,
        height: 22,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemQtyText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '700',
    },
    itemName: {
        color: '#94a3b8',
        fontSize: 13,
        flex: 1,
    },
    pricingDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginTop: 4,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pricingLabel: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
    },
    pricingValue: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '700',
    },
    pricingTotalRow: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    pricingTotalLabel: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '800',
    },
    pricingTotalValue: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '900',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    pingBtn: {
        backgroundColor: 'rgba(6,182,212,0.1)',
        borderColor: 'rgba(6,182,212,0.22)',
    },
    cancelActionBtn: {
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderColor: 'rgba(248,113,113,0.22)',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sliderWrapper: {
        paddingTop: 16,
        gap: 8,
    },
    sliderHint: {
        color: 'rgba(255,255,255,0.22)',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    track: {
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#22c55e',
        borderRadius: TRACK_H / 2,
    },
    trackLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    thumb: {
        position: 'absolute',
        left: 5,
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 10,
    },
    cancelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cancelTitle: {
        color: '#f1f5f9',
        fontSize: 15,
        fontWeight: '800',
    },
    cancelSubtitle: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 14,
        textAlign: 'center',
    },
    reasonList: {
        gap: 6,
        marginBottom: 18,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    reasonRowSelected: {
        borderColor: 'rgba(239,68,68,0.35)',
        backgroundColor: 'rgba(239,68,68,0.07)',
    },
    reasonDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#475569',
    },
    reasonDotSelected: {
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
    },
    reasonText: {
        color: '#64748b',
        fontSize: 13,
        fontWeight: '600',
    },
    cancelTrack: {
        borderColor: 'rgba(239,68,68,0.2)',
        backgroundColor: 'rgba(239,68,68,0.05)',
    },
    cancelFill: {
        backgroundColor: '#ef4444',
    },
    cancelThumb: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
});

