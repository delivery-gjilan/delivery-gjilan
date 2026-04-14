import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, PanResponder, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '@/hooks/useTranslations';
import type { DriverOrder } from '@/utils/types';

const THUMB = 56;
const TRACK_H = 62;
const PING_UNLOCK_S = 180;   // 3 min after I'm Here
const CANCEL_UNLOCK_S = 600; // 10 min after arrival

interface Props {
    customerName: string;
    customerPhone: string | null;
    arrivedNotifSent: boolean;
    arrivedAt: number;
    notifiedAt: number | null;
    businesses: DriverOrder['businesses'];
    orderPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    insetBottom: number;
    onNotify: () => void;
    onPingAgain: () => void;
    onConfirm: () => Promise<void>;
    onCancel: (reason: string) => void;
    onDismiss?: () => void;
    onSuccessAnimStart?: () => void;
}

export function DeliverySlider({
    customerName,
    customerPhone,
    arrivedNotifSent,
    arrivedAt,
    notifiedAt,
    businesses,
    orderPrice,
    deliveryPrice,
    totalPrice,
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

    return (
        <View style={[styles.panel, { paddingBottom: done || showCancelSheet ? insetBottom + 16 : 0 }]}>
            {!done && (
                !showCancelSheet ? (
                    <>
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            {onDismiss && (
                                <Pressable style={styles.dismissBtn} onPress={onDismiss} hitSlop={10}>
                                    <Ionicons name="close" size={18} color="#64748b" />
                                </Pressable>
                            )}
                            <View style={styles.iconRing}>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{s.arrived_at_dropoff}</Text>
                                <Text style={styles.sub} numberOfLines={1}>{customerName}</Text>
                            </View>
                            {!!customerPhone && (
                                <Pressable
                                    style={styles.callBtn}
                                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                                    hitSlop={8}
                                >
                                    <Ionicons name="call-outline" size={17} color="#22d3ee" />
                                </Pressable>
                            )}
                            <Pressable
                                style={[styles.notifBtn, arrivedNotifSent && styles.notifBtnSent]}
                                disabled={arrivedNotifSent}
                                onPress={onNotify}
                            >
                                <Ionicons
                                    name={arrivedNotifSent ? 'checkmark-circle' : 'notifications-outline'}
                                    size={16}
                                    color={arrivedNotifSent ? '#22c55e' : '#f1f5f9'}
                                />
                                <Text style={[styles.notifText, arrivedNotifSent && { color: '#22c55e' }]}>
                                    {arrivedNotifSent ? s.notified : s.im_here}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Order items + pricing */}
                        {businesses.length > 0 && (
                            <View style={styles.itemsSection}>
                                <ScrollView style={{ maxHeight: 108 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                    {businesses.flatMap((b) => b.items ?? []).map((item, i: number) => (
                                        <View key={i} style={styles.itemRow}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.itemQty}>×{item.quantity}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                                <View style={styles.pricingRow}>
                                    <Text style={styles.pricingLabel}>{s.subtotal}</Text>
                                    <Text style={styles.pricingValue}>€{orderPrice.toFixed(2)}</Text>
                                </View>
                                <View style={styles.pricingRow}>
                                    <Text style={styles.pricingLabel}>{s.delivery_fee}</Text>
                                    <Text style={styles.pricingValue}>€{deliveryPrice.toFixed(2)}</Text>
                                </View>
                                <View style={[styles.pricingRow, styles.pricingTotal]}>
                                    <Text style={styles.pricingTotalLabel}>{s.total}</Text>
                                    <Text style={styles.pricingTotalValue}>€{totalPrice.toFixed(2)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Delivery slider */}
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
                                <Ionicons name="checkmark" size={24} color="#fff" />
                            </Animated.View>
                        </View>

                        {/* Trouble row */}
                        <View style={styles.troubleRow}>
                            <Text style={styles.troubleLabel}>{s.customer_not_here}</Text>

                            <Pressable
                                style={[styles.troubleBtn, !pingUnlocked && styles.troubleBtnLocked]}
                                disabled={!pingUnlocked}
                                onPress={onPingAgain}
                            >
                                <Ionicons
                                    name="notifications-outline"
                                    size={13}
                                    color={pingUnlocked ? '#f59e0b' : '#475569'}
                                />
                                <Text style={[styles.troubleBtnText, { color: pingUnlocked ? '#f59e0b' : '#475569' }]}>
                                    {pingUnlocked
                                        ? s.ping_again
                                        : (!arrivedNotifSent ? s.ping : s.ping_time.replace('{{time}}', fmtTime(pingRemaining)))}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.troubleBtn,
                                    styles.troubleBtnCancel,
                                    !cancelUnlocked && styles.troubleBtnLocked,
                                ]}
                                disabled={!cancelUnlocked}
                                onPress={() => setShowCancelSheet(true)}
                            >
                                <Ionicons
                                    name="close-circle-outline"
                                    size={13}
                                    color={cancelUnlocked ? '#ef4444' : '#475569'}
                                />
                                <Text style={[styles.troubleBtnText, { color: cancelUnlocked ? '#ef4444' : '#475569' }]}>
                                    {cancelUnlocked ? s.cancel_order : s.cancel_time.replace('{{time}}', fmtTime(cancelRemaining))}
                                </Text>
                            </Pressable>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 24,
        zIndex: 120,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    dismissBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
    },
    iconRing: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(34,197,94,0.12)',
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
    notifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    notifBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    notifText: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: '700',
    },
    callBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(34,211,238,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    itemsSection: {
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    itemName: {
        color: '#94a3b8',
        fontSize: 12,
        flex: 1,
    },
    itemQty: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 5,
        marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    pricingLabel: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
    },
    pricingValue: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    pricingTotal: {
        borderTopColor: 'rgba(255,255,255,0.1)',
        borderTopWidth: 1,
        marginTop: 6,
        paddingTop: 6,
    },
    pricingTotalLabel: {
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '800',
    },
    pricingTotalValue: {
        color: '#22d3ee',
        fontSize: 14,
        fontWeight: '900',
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
        left: 3,
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    troubleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingBottom: 16,
    },
    troubleLabel: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    troubleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.2)',
    },
    troubleBtnCancel: {
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderColor: 'rgba(239,68,68,0.2)',
    },
    troubleBtnLocked: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.06)',
    },
    troubleBtnText: {
        fontSize: 11,
        fontWeight: '700',
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
        marginBottom: 12,
        textAlign: 'center',
    },
    reasonList: {
        gap: 6,
        marginBottom: 16,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
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
