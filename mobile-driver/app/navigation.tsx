import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking, Animated, PanResponder, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED, UPDATE_ORDER_STATUS, DRIVER_NOTIFY_CUSTOMER, ASSIGN_DRIVER_TO_ORDER } from '@/graphql/operations/orders';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { useNavigationStore } from '@/store/navigationStore';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useAuthStore } from '@/store/authStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { OrderAcceptSheet } from '@/components/OrderAcceptSheet';
import * as Haptics from 'expo-haptics';
import type { NavigationPhase } from '@/store/navigationStore';

/* ─── Constants ─── */
const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    PREPARING: '#06B6D4',
    READY: '#3B82F6',
    OUT_FOR_DELIVERY: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Delivering',
};

/* ─── Slide-to-confirm pickup component ─── */
const PICKUP_TRACK_H = 62;
const PICKUP_THUMB = 52;

function PickupSlider({
    businessName,
    etaMins,
    insetBottom,
    onConfirm,
    onCancel,
}: {
    businessName: string;
    etaMins: number | null;
    insetBottom: number;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}) {
    const trackWidth = useRef(0);
    const translateX = useRef(new Animated.Value(0)).current;
    const confirmed  = useRef(false);
    const [done, setDone] = useState(false);
    const [splashVisible, setSplashVisible] = useState(false);

    // ETA badge idle animation: spring-in → gentle float
    const etaScale  = useRef(new Animated.Value(0)).current;
    const etaHoverY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (etaMins == null) return;
        Animated.spring(etaScale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 7 })
            .start(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(etaHoverY, { toValue: -5, duration: 900, useNativeDriver: true }),
                        Animated.timing(etaHoverY, { toValue: 0,  duration: 900, useNativeDriver: true }),
                    ]),
                ).start();
            });
    }, [etaScale, etaHoverY, etaMins]);

    // Splash card (post-confirm) animations
    const splashOpacity = useRef(new Animated.Value(0)).current;
    const splashScale   = useRef(new Animated.Value(0.4)).current;
    const splashHoverY  = useRef(new Animated.Value(0)).current;

    // 24-piece confetti for the splash — stable identity across renders
    const splashConfetti = useRef(
        Array.from({ length: 24 }, (_, i) => ({
            anim: new Animated.Value(0),
            x:    (Math.random() - 0.5) * 360,
            vy:   Math.random() * 280 + 120,
            color: ['#0ea5e9','#38bdf8','#7dd3fc','#22c55e','#3b82f6','#818cf8','#f59e0b'][i % 7],
            size: Math.random() * 10 + 5,
            rotation: Math.random() * 720 - 360,
            aspect: Math.random() > 0.5 ? 0.45 : 0.9,
        }))
    ).current;

    const launchSplash = useCallback(() => {
        setSplashVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Stagger confetti burst
        splashConfetti.forEach((p, i) => {
            setTimeout(() => {
                Animated.timing(p.anim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
            }, i * 28);
        });
        // Spring card in, then start hover loop
        Animated.parallel([
            Animated.spring(splashScale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 7 }),
            Animated.timing(splashOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(splashHoverY, { toValue: -8, duration: 850, useNativeDriver: true }),
                    Animated.timing(splashHoverY, { toValue: 0,  duration: 850, useNativeDriver: true }),
                ]),
            ).start();
        });
    }, [splashConfetti, splashScale, splashOpacity, splashHoverY]);

    const fillOpacity  = translateX.interpolate({ inputRange: [0, 200], outputRange: [0, 1], extrapolate: 'clamp' });
    const labelOpacity = translateX.interpolate({ inputRange: [0, 80],  outputRange: [1, 0], extrapolate: 'clamp' });

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !confirmed.current,
            onPanResponderMove: (_, gs) => {
                const max = trackWidth.current - PICKUP_THUMB - 6;
                translateX.setValue(Math.max(0, Math.min(gs.dx, max)));
            },
            onPanResponderRelease: (_, gs) => {
                const max = trackWidth.current - PICKUP_THUMB - 6;
                if (gs.dx >= max * 0.82 && !confirmed.current) {
                    confirmed.current = true;
                    setDone(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    Animated.timing(translateX, { toValue: max, duration: 120, useNativeDriver: true })
                        .start(() => {
                            launchSplash();
                            // Hold splash for 1.9s then invoke onConfirm (advances route)
                            setTimeout(async () => { await onConfirm(); }, 1900);
                        });
                } else {
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }),
    ).current;

    return (
        <View style={[pickupStyles.panel, { paddingBottom: insetBottom + 16 }]}>
            <View style={pickupStyles.handle} />

            {/* Header row */}
            <View style={pickupStyles.header}>
                <View style={pickupStyles.iconRing}>
                    <Ionicons name="bag-check-outline" size={22} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={pickupStyles.title}>Arrived at Pickup</Text>
                    <Text style={pickupStyles.sub} numberOfLines={1}>{businessName}</Text>
                </View>
                {/* ETA badge to dropoff — springs in then floats */}
                {etaMins != null && (
                    <Animated.View
                        style={[
                            pickupStyles.etaBadge,
                            { transform: [{ scale: etaScale }, { translateY: etaHoverY }] },
                        ]}
                    >
                        <Ionicons name="navigate-circle-outline" size={20} color="#0ea5e9" />
                        <Text style={pickupStyles.etaValue}>{etaMins} min</Text>
                        <Text style={pickupStyles.etaLabel}>to dropoff</Text>
                    </Animated.View>
                )}
            </View>

            {/* Slide track */}
            <View
                style={pickupStyles.track}
                onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
            >
                <Animated.View style={[pickupStyles.fill, { opacity: fillOpacity }]} />
                <Animated.Text style={[pickupStyles.trackLabel, { opacity: labelOpacity }]}>
                    Slide to confirm pickup →
                </Animated.Text>
                <Animated.View
                    style={[pickupStyles.thumb, done && pickupStyles.thumbDone, { transform: [{ translateX }] }]}
                    {...pan.panHandlers}
                >
                    <Ionicons name={done ? 'checkmark' : 'bicycle-outline'} size={24} color="#fff" />
                </Animated.View>
            </View>

            {/* End navigation link */}
            <Pressable style={pickupStyles.secondary} onPress={onCancel}>
                <Text style={pickupStyles.secondaryText}>End Navigation</Text>
            </Pressable>

            {/* ── Pickup-confirmed splash overlay ── */}
            {splashVisible && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, pickupStyles.splashOverlay]}
                >
                    {/* Confetti burst */}
                    {splashConfetti.map((p, i) => {
                        const cY     = p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -p.vy, -(p.vy * 0.72)] });
                        const op     = p.anim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
                        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotation}deg`] });
                        return (
                            <Animated.View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size * p.aspect,
                                    backgroundColor: p.color,
                                    borderRadius: p.size * 0.25,
                                    opacity: op,
                                    transform: [{ translateX: p.x }, { translateY: cY }, { rotate }],
                                }}
                            />
                        );
                    })}

                    {/* Card */}
                    <Animated.View
                        style={[
                            pickupStyles.splashCard,
                            {
                                opacity: splashOpacity,
                                transform: [{ scale: splashScale }, { translateY: splashHoverY }],
                            },
                        ]}
                    >
                        <View style={pickupStyles.splashIconRing}>
                            <Ionicons name="navigate" size={42} color="#fff" />
                        </View>
                        <Text style={pickupStyles.splashTitle}>On your way!</Text>
                        {etaMins != null && (
                            <View style={pickupStyles.splashBadge}>
                                <Text style={pickupStyles.splashEtaNum}>{etaMins} min</Text>
                                <Text style={pickupStyles.splashEtaLabel}>to dropoff</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const pickupStyles = StyleSheet.create({
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
        zIndex: 200,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
    },
    iconRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(59,130,246,0.12)',
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
    etaBadge: {
        backgroundColor: '#0ea5e9',
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 10,
        alignItems: 'center',
        gap: 2,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 16,
        elevation: 16,
    },
    etaValue: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 0.5,
        lineHeight: 28,
    },
    etaLabel: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },
    track: {
        height: PICKUP_TRACK_H,
        borderRadius: PICKUP_TRACK_H / 2,
        backgroundColor: 'rgba(59,130,246,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(59,130,246,0.20)',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#3b82f6',
        borderRadius: PICKUP_TRACK_H / 2,
    },
    trackLabel: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    thumb: {
        position: 'absolute',
        left: 5,
        width: PICKUP_THUMB,
        height: PICKUP_THUMB,
        borderRadius: PICKUP_THUMB / 2,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    thumbDone: {
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
    },
    secondary: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    secondaryText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
    },

    // Pickup-confirmed splash overlay
    splashOverlay: {
        backgroundColor: 'rgba(6,9,20,0.90)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    splashCard: {
        alignItems: 'center',
        gap: 10,
    },
    splashIconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#0ea5e9',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.7,
        shadowRadius: 24,
        elevation: 20,
        marginBottom: 4,
    },
    splashTitle: {
        color: '#f1f5f9',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 0.4,
    },
    splashBadge: {
        backgroundColor: '#0ea5e9',
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 3,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 18,
        elevation: 18,
    },
    splashEtaNum: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    splashEtaLabel: {
        color: 'rgba(255,255,255,0.60)',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },
});

/* ─── Slide-to-confirm delivery component ─── */
const THUMB = 56;
const TRACK_H = 62;
const PING_UNLOCK_S = 180;   // 3 min after I'm Here
const CANCEL_UNLOCK_S = 600; // 10 min after arrival

const CANCEL_REASONS = [
    'Customer not responding',
    'Wrong address',
    'Customer refused delivery',
    'Safety concern',
    'Other',
];

function DeliverySlider({
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
    onSuccessAnimStart,
}: {
    customerName: string;
    customerPhone: string | null;
    arrivedNotifSent: boolean;
    arrivedAt: number;
    notifiedAt: number | null;
    businesses: any[];
    orderPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    insetBottom: number;
    onNotify: () => void;
    onPingAgain: () => void;
    onConfirm: () => Promise<void>;
    onCancel: (reason: string) => void;
    onSuccessAnimStart?: () => void;
}) {
    const trackWidth = useRef(0);
    const cancelTrackWidth = useRef(0);
    const translateX = useRef(new Animated.Value(0)).current;
    const cancelTranslateX = useRef(new Animated.Value(0)).current;
    const confirmed = useRef(false);
    const cancelConfirmed = useRef(false);
    const [done, setDone] = useState(false);
    const [showCancelSheet, setShowCancelSheet] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    // Tick every second to recompute elapsed times reactively
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

    // Delivery slider animations
    const successOpacity = useRef(new Animated.Value(0)).current;
    const successScale   = useRef(new Animated.Value(0.4)).current;
    const fillOpacity    = translateX.interpolate({ inputRange: [0, 200], outputRange: [0, 1], extrapolate: 'clamp' });
    const labelOpacity   = translateX.interpolate({ inputRange: [0, 80],  outputRange: [1, 0], extrapolate: 'clamp' });

    // Cancel slider animations
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
                        .start(() => onCancel(selectedReason));
                } else {
                    Animated.spring(cancelTranslateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }),
    ).current;

    return (
        <View style={[sliderStyles.panel, { paddingBottom: done || showCancelSheet ? insetBottom + 16 : 0 }]}>
            {!done && (
                !showCancelSheet ? (
                    <>
                        <View style={sliderStyles.handle} />

                        {/* Header */}
                        <View style={sliderStyles.header}>
                            <View style={sliderStyles.iconRing}>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={sliderStyles.title}>Arrived at Dropoff</Text>
                                <Text style={sliderStyles.sub} numberOfLines={1}>{customerName}</Text>
                            </View>
                            {!!customerPhone && (
                                <Pressable
                                    style={sliderStyles.callBtn}
                                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                                    hitSlop={8}
                                >
                                    <Ionicons name="call-outline" size={17} color="#22d3ee" />
                                </Pressable>
                            )}
                            <Pressable
                                style={[sliderStyles.notifBtn, arrivedNotifSent && sliderStyles.notifBtnSent]}
                                disabled={arrivedNotifSent}
                                onPress={onNotify}
                            >
                                <Ionicons
                                    name={arrivedNotifSent ? 'checkmark-circle' : 'notifications-outline'}
                                    size={16}
                                    color={arrivedNotifSent ? '#22c55e' : '#f1f5f9'}
                                />
                                <Text style={[sliderStyles.notifText, arrivedNotifSent && { color: '#22c55e' }]}>
                                    {arrivedNotifSent ? 'Notified' : "I'm Here"}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Order items + pricing */}
                        {businesses.length > 0 && (
                            <View style={sliderStyles.itemsSection}>
                                <ScrollView style={{ maxHeight: 108 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                    {businesses.flatMap((b: any) => b.items ?? []).map((item: any, i: number) => (
                                        <View key={i} style={sliderStyles.itemRow}>
                                            <Text style={sliderStyles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={sliderStyles.itemQty}>×{item.quantity}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                                <View style={sliderStyles.pricingRow}>
                                    <Text style={sliderStyles.pricingLabel}>Subtotal</Text>
                                    <Text style={sliderStyles.pricingValue}>€{orderPrice.toFixed(2)}</Text>
                                </View>
                                <View style={sliderStyles.pricingRow}>
                                    <Text style={sliderStyles.pricingLabel}>Delivery</Text>
                                    <Text style={sliderStyles.pricingValue}>€{deliveryPrice.toFixed(2)}</Text>
                                </View>
                                <View style={[sliderStyles.pricingRow, sliderStyles.pricingTotal]}>
                                    <Text style={sliderStyles.pricingTotalLabel}>Total</Text>
                                    <Text style={sliderStyles.pricingTotalValue}>€{totalPrice.toFixed(2)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Delivery slider track */}
                        <View
                            style={sliderStyles.track}
                            onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
                        >
                            <Animated.View style={[sliderStyles.fill, { opacity: fillOpacity }]} />
                            <Animated.Text style={[sliderStyles.trackLabel, { opacity: labelOpacity }]}>
                                Slide to confirm delivery →
                            </Animated.Text>
                            <Animated.View
                                style={[sliderStyles.thumb, { transform: [{ translateX }] }]}
                                {...deliveryPan.panHandlers}
                            >
                                <Ionicons name="checkmark" size={24} color="#fff" />
                            </Animated.View>
                        </View>

                        {/* Trouble row — timed */}
                        <View style={sliderStyles.troubleRow}>
                            <Text style={sliderStyles.troubleLabel}>Customer not here?</Text>

                            {/* Ping Again — unlocks 3 min after I'm Here */}
                            <Pressable
                                style={[sliderStyles.troubleBtn, !pingUnlocked && sliderStyles.troubleBtnLocked]}
                                disabled={!pingUnlocked}
                                onPress={onPingAgain}
                            >
                                <Ionicons
                                    name="notifications-outline"
                                    size={13}
                                    color={pingUnlocked ? '#f59e0b' : '#475569'}
                                />
                                <Text style={[sliderStyles.troubleBtnText, { color: pingUnlocked ? '#f59e0b' : '#475569' }]}>
                                    {pingUnlocked
                                        ? 'Ping Again'
                                        : (!arrivedNotifSent ? 'Ping' : `Ping ${fmtTime(pingRemaining)}`)}
                                </Text>
                            </Pressable>

                            {/* Cancel — unlocks 10 min after arrival */}
                            <Pressable
                                style={[
                                    sliderStyles.troubleBtn,
                                    sliderStyles.troubleBtnCancel,
                                    !cancelUnlocked && sliderStyles.troubleBtnLocked,
                                ]}
                                disabled={!cancelUnlocked}
                                onPress={() => setShowCancelSheet(true)}
                            >
                                <Ionicons
                                    name="close-circle-outline"
                                    size={13}
                                    color={cancelUnlocked ? '#ef4444' : '#475569'}
                                />
                                <Text style={[sliderStyles.troubleBtnText, { color: cancelUnlocked ? '#ef4444' : '#475569' }]}>
                                    {cancelUnlocked ? 'Cancel Order' : `Cancel ${fmtTime(cancelRemaining)}`}
                                </Text>
                            </Pressable>
                        </View>
                    </>
                ) : (
                    /* ── Cancel sheet ── */
                    <>
                        <View style={sliderStyles.handle} />
                        <View style={sliderStyles.cancelHeader}>
                            <Pressable onPress={() => setShowCancelSheet(false)} hitSlop={10}>
                                <Ionicons name="arrow-back" size={20} color="#94a3b8" />
                            </Pressable>
                            <Text style={sliderStyles.cancelTitle}>Cancel Order</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={sliderStyles.cancelSubtitle}>Select a reason</Text>
                        <View style={sliderStyles.reasonList}>
                            {CANCEL_REASONS.map((r) => (
                                <Pressable
                                    key={r}
                                    style={[sliderStyles.reasonRow, selectedReason === r && sliderStyles.reasonRowSelected]}
                                    onPress={() => setSelectedReason(r)}
                                >
                                    <View style={[sliderStyles.reasonDot, selectedReason === r && sliderStyles.reasonDotSelected]} />
                                    <Text style={[sliderStyles.reasonText, selectedReason === r && { color: '#f1f5f9' }]}>
                                        {r}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Slide-to-cancel track */}
                        <View
                            style={[sliderStyles.track, sliderStyles.cancelTrack, !selectedReason && { opacity: 0.35 }]}
                            onLayout={(e) => { cancelTrackWidth.current = e.nativeEvent.layout.width; }}
                        >
                            <Animated.View style={[sliderStyles.fill, sliderStyles.cancelFill, { opacity: cancelFillOpacity }]} />
                            <Animated.Text style={[sliderStyles.trackLabel, { opacity: cancelLabelOpacity }]}>
                                {selectedReason ? 'Slide to cancel order →' : 'Select a reason first'}
                            </Animated.Text>
                            <Animated.View
                                style={[sliderStyles.thumb, sliderStyles.cancelThumb, { transform: [{ translateX: cancelTranslateX }] }]}
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

const sliderStyles = StyleSheet.create({
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
    /* Cancel sheet */
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
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,15,26,0.96)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
    },
});

export default function NavigationScreen() {
    const apolloClient = useApolloClient();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const lastProgressRef = useRef(0);
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const mapViewRef = useRef<any>(null);
    const mapDimOpacity      = useRef(new Animated.Value(0)).current;
    const successCardOpacity = useRef(new Animated.Value(0)).current;
    const successCardY       = useRef(new Animated.Value(320)).current;  // spring-in only
    const successCardHoverY  = useRef(new Animated.Value(0)).current;    // hover loop only
    const successCardYTotal  = useRef(Animated.add(successCardY, successCardHoverY)).current;
    const successCardScale   = useRef(new Animated.Value(0.72)).current;
    const confettiData = useRef(
        Array.from({ length: 60 }, (_, i) => ({
            anim:     new Animated.Value(0),
            x:        (Math.random() - 0.5) * 520,
            vy:       Math.random() * 480 + 180,
            color:    (['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#f97316', '#06b6d4', '#eab308', '#ef4444'] as const)[i % 9],
            size:     Math.random() * 11 + 6,
            rotation: Math.random() * 900 - 450,
            // alternate between rectangles and squares for visual variety
            aspect:   Math.random() > 0.5 ? 0.44 : 0.9,
        }))
    ).current;
    const [showSuccessCard, setShowSuccessCard] = useState(false);
    const [successCardPrice, setSuccessCardPrice] = useState(0);

    const [showPickupPanel, setShowPickupPanel] = useState(false);
    const [showDeliveryPanel, setShowDeliveryPanel] = useState(false);
    const [showNearEndBar, setShowNearEndBar] = useState(false);
    const [notifManualSent, setNotifManualSent] = useState(false);
    const [arrivedNotifSent, setArrivedNotifSent] = useState(false);
    const [arrivedAt, setArrivedAt] = useState<number>(0);
    const [notifiedAt, setNotifiedAt] = useState<number | null>(null);
    const [newOrderToast, setNewOrderToast] = useState<{ id: string; businessName: string } | null>(null);
    const prevOrderIdsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks which order IDs have already had ETA_LT_3_MIN fired this session.
    // Backend Redis dedup is the authoritative gate; this ref just avoids firing
    // the mutation on every 2 s progress tick once below the threshold.
    const etaNotificationSentRef = useRef<Set<string>>(new Set());
    const [markingPickedUpIds, setMarkingPickedUpIds] = useState<Set<string>>(new Set());
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [driverNotifyCustomer] = useMutation(DRIVER_NOTIFY_CUSTOMER);
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    /* ── Accept-sheet state (ring during navigation) ── */
    const [acceptSheetOrder, setAcceptSheetOrder] = useState<any>(null);
    const [accepting, setAccepting] = useState(false);
    const [acceptAutoCountdown, setAcceptAutoCountdown] = useState(true);
    const skippedIds = useRef(new Set<string>());

    /* ── Store ── */
    const {
        order,
        phase,
        destination,
        originLocation,
        distanceRemainingM,
        durationRemainingS,
        advanceToDropoff,
        stopNavigation,
        updateProgress,
        startNavigation,
        isNavigating,
    } = useNavigationStore();
    const isOnline = useAuthStore((state) => state.isOnline);
    const { dispatchModeEnabled } = useStoreStatus();

    /* ── Driver metrics: maxActiveOrders capacity check ── */
    const { data: metricsData } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 60_000,
    });
    const maxActiveOrders: number = (metricsData as any)?.myDriverMetrics?.maxActiveOrders ?? 1;

    /* ── Orders query + real-time subscription ── */
    const { data, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    useSubscription(ALL_ORDERS_UPDATED, {
        onData: ({ data }) => {
            const incomingOrders = data.data?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                refetch();
                return;
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));

                incomingOrders.forEach((order: any) => {
                    const existingOrder = byId.get(String(order?.id));
                    byId.set(String(order?.id), { ...existingOrder, ...order });
                });

                return {
                    ...(existing ?? {}),
                    orders: Array.from(byId.values()),
                };
            });
        },
    });

    /* ── Available (unassigned READY) orders ── */
    const availableOrders = useMemo(() => {
        if (dispatchModeEnabled) return [];
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => o.status === 'READY' && !o.driver?.id);
    }, [data, dispatchModeEnabled]);

    /* ── Filter assigned orders ── */
    const assignedOrders = useMemo(() => {
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => {
            if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
            return o.driver?.id === currentDriverId;
        });
    }, [data, currentDriverId]);

    /* ── Auto-present accept sheet if driver has capacity for more orders ── */
    useEffect(() => {
        if (!isOnline || acceptSheetOrder || dispatchModeEnabled) return;
        if (assignedOrders.length >= maxActiveOrders) return;
        const next = availableOrders.find((o: any) => !skippedIds.current.has(o.id));
        if (!next) return;
        setAcceptAutoCountdown(true);
        setAcceptSheetOrder(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableOrders.length, isOnline, assignedOrders.length, maxActiveOrders]);

    /* ── Accept order handler ── */
    const handleAcceptOrder = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            // Order is now assigned — it will appear in assignedOrders via subscription.
            // We stay on the current navigation; the driver can switch orders from the bottom bar.
            setAcceptSheetOrder(null);
        } catch {
            // Silently dismiss — next render cycle will re-present if still available
            setAcceptSheetOrder(null);
        } finally {
            setAccepting(false);
        }
    }, [currentDriverId, assignDriver]);

    /* ── Skip order handler ── */
    const handleSkipOrder = useCallback(() => {
        if (acceptSheetOrder) skippedIds.current.add(acceptSheetOrder.id);
        setAcceptSheetOrder(null);
    }, [acceptSheetOrder]);

    /* ── Driver location (for live updates during navigation) ── */
    const { location } = useDriverLocation({
        smoothing: false,
        timeInterval: 2000,
        distanceFilter: 10,
    });

    /* ── Build coordinates for MapboxNavigationView ── */
    // Use stored origin initially, then switch to live GPS updates
    const currentOrigin = location || originLocation;
    const coordinates = useMemo(() => {
        if (!currentOrigin || !destination) return null;
        return [
            { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude },
            { latitude: destination.latitude, longitude: destination.longitude },
        ];
    }, [currentOrigin?.latitude, currentOrigin?.longitude, destination?.latitude, destination?.longitude]);

    /* ── Store for feeding Navigation SDK location to heartbeat ── */
    const setNavigationLocation = useNavigationLocationStore((state) => state.setLocation);
    const clearNavigationLocation = useNavigationLocationStore((state) => state.clearLocation);

    /* ── Cleanup: clear navigation location and toast timer on unmount ── */
    useEffect(() => {
        return () => {
            clearNavigationLocation();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [clearNavigationLocation]);

    /* ── Detect newly assigned orders and show toast ── */
    useEffect(() => {
        const currentIds = new Set(assignedOrders.map((o: any) => String(o.id)));
        if (prevOrderIdsRef.current.size > 0) {
            const newOrders = assignedOrders.filter((o: any) => !prevOrderIdsRef.current.has(String(o.id)));
            if (newOrders.length > 0) {
                const newest = newOrders[0];
                const bizName = newest.businesses?.[0]?.business?.name ?? 'New order';
                setNewOrderToast({ id: newest.id, businessName: bizName });
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setNewOrderToast(null), 6000);
            }
        }
        prevOrderIdsRef.current = currentIds;
    }, [assignedOrders]);

    /* ── Reset near-end bar when order changes ── */
    useEffect(() => {
        setShowNearEndBar(false);
        setNotifManualSent(false);
        setArrivedNotifSent(false);
        setArrivedAt(0);
        setNotifiedAt(null);
    }, [order?.id]);

    /* ── Show near-end bar when < 5 min from dropoff ── */
    useEffect(() => {
        if (
            phase === 'to_dropoff' &&
            durationRemainingS != null &&
            durationRemainingS <= 300 &&
            !showDeliveryPanel
        ) {
            setShowNearEndBar(true);
        }
    }, [durationRemainingS, phase, showDeliveryPanel]);

    /* ── Detect when admin reassigns the active navigation order away ── */
    const reassignedAlertShownRef = useRef(false);
    useEffect(() => {
        if (!order?.id || !isNavigating) return;
        const stillAssigned = assignedOrders.some((o: any) => o.id === order.id);
        if (!stillAssigned && !reassignedAlertShownRef.current) {
            reassignedAlertShownRef.current = true;
            Alert.alert(
                'Order Reassigned',
                'This order has been reassigned to another driver by an admin.',
                [{ text: 'OK', onPress: () => {
                    setShowDeliveryPanel(false);
                    setShowPickupPanel(false);
                    clearNavigationLocation();
                    stopNavigation();
                    router.back();
                }}],
                { cancelable: false },
            );
        }
    }, [assignedOrders, order?.id, isNavigating, clearNavigationLocation, stopNavigation, router]);

    /* ── Auto-notify customer when driver is < 3 min away (to_dropoff only) ── */
    useEffect(() => {        if (
            phase !== 'to_dropoff' ||
            durationRemainingS == null ||
            durationRemainingS > 180 ||
            !order?.id
        ) return;

        if (etaNotificationSentRef.current.has(order.id)) return;
        etaNotificationSentRef.current.add(order.id);

        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ETA_LT_3_MIN' } })
            .catch(() => { /* best-effort — backend will retry on next heartbeat window */ });
    }, [durationRemainingS, phase, order?.id, driverNotifyCustomer]);

    /* ── Callbacks ── */
    const handleRouteProgressChanged = useCallback(
        (event: any) => {
            const eventData = event?.nativeEvent ?? event ?? {};
            const { distanceRemaining, durationRemaining, fractionTraveled, location } = eventData;
            
            // Update navigation progress
            if (distanceRemaining != null) {
                updateProgress(distanceRemaining, durationRemaining ?? 0, fractionTraveled ?? 0);
            }

            // Feed location to heartbeat system (avoids duplicate GPS polling)
            if (location?.latitude != null && location?.longitude != null) {
                setNavigationLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                });
            }
        },
        [updateProgress, setNavigationLocation],
    );

    const handleCancelNavigation = useCallback(() => {
        clearNavigationLocation(); // Stop providing location to heartbeat
        stopNavigation();
        router.back();
    }, [clearNavigationLocation, stopNavigation, router]);

    const handleWaypointArrival = useCallback(
        (_event: any) => {
            if (phase === 'to_pickup' && order?.dropoff) {
                setShowPickupPanel(true);
            }
        },
        [phase, order],
    );

    const handleFinalDestinationArrival = useCallback(() => {
        setShowDeliveryPanel(true);
        setArrivedAt(Date.now());
        // Notify customer that the driver has arrived and is waiting outside.
        // Backend deduplicates via Redis so this is safe to call unconditionally.
        if (order?.id) {
            driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                .catch(() => { /* best-effort */ });
        }
    }, [order?.id, driverNotifyCustomer]);

    const handleUserOffRoute = useCallback(() => {
        // SDK handles re-routing automatically — just log for analytics
        console.log('[Navigation] Driver went off route — SDK is re-routing');
    }, []);

    /* ── Switch to different order ── */
    const switchToOrder = useCallback((newOrder: any) => {
        if (!currentOrigin) return;
        
        const bizLoc = newOrder.businesses?.[0]?.business?.location;
        const dropLoc = newOrder.dropOffLocation;
        if (!bizLoc) return;

        const pickup = {
            latitude: Number(bizLoc.latitude),
            longitude: Number(bizLoc.longitude),
            label: newOrder.businesses?.[0]?.business?.name ?? 'Pickup',
        };
        const dropoff = dropLoc
            ? {
                latitude: Number(dropLoc.latitude),
                longitude: Number(dropLoc.longitude),
                label: dropLoc.address ?? 'Drop-off',
            }
            : null;
        const customerName = newOrder.user
            ? `${newOrder.user.firstName} ${newOrder.user.lastName}`
            : 'Customer';

        const navOrder = {
            id: newOrder.id,
            status: newOrder.status,
            businessName: newOrder.businesses?.[0]?.business?.name ?? 'Business',
            customerName,
            customerPhone: newOrder.user?.phoneNumber ?? null,
            pickup,
            dropoff,
        };

        const newPhase: NavigationPhase =
            newOrder.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';

        const origin = { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude };
        startNavigation(navOrder, newPhase, origin);
    }, [currentOrigin, startNavigation]);

    /* ── Mark order as picked up ── */
    const handleMarkPickedUp = useCallback(async (orderId: string) => {
        setMarkingPickedUpIds(prev => new Set(prev).add(orderId));
        try {
            await updateOrderStatus({ variables: { id: orderId, status: 'OUT_FOR_DELIVERY' } });
        } catch { /* ignore */ } finally {
            setMarkingPickedUpIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    }, [updateOrderStatus]);

    /* ── Recenter map ── */
    const handleRecenter = useCallback(() => {
        mapViewRef.current?.recenterMap?.();
    }, []);

    /* ── Guard: if no destination or location yet, show loading state ── */
    if (!coordinates || !order || !destination) {
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <View style={styles.loadingCenter}>
                    <Text style={styles.loadingText}>
                        {!currentOrigin ? 'Waiting for GPS...' : 'Loading navigation...'}
                    </Text>
                </View>
                <Pressable
                    style={[styles.cancelBtn, { top: insets.top + 12 }]}
                    onPress={handleCancelNavigation}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ═══ Full-screen Mapbox Navigation ═══ */}
            <MapboxNavigationView
                ref={mapViewRef}
                style={styles.navView}
                coordinates={coordinates}
                waypointIndices={[0, coordinates.length - 1]}
                routeProfile="driving-traffic"
                locale="en"
                mute={true}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                disableAlternativeRoutes={true}
                followingZoom={16}
                initialLocation={{
                    latitude: currentOrigin.latitude,
                    longitude: currentOrigin.longitude,
                    zoom: 15,
                }}
                onRouteProgressChanged={handleRouteProgressChanged}
                onCancelNavigation={handleCancelNavigation}
                onWaypointArrival={handleWaypointArrival}
                onFinalDestinationArrival={handleFinalDestinationArrival}
                onUserOffRoute={handleUserOffRoute}
                onRouteChanged={() => console.log('[Navigation] Route changed (re-routed)')}
                onRoutesLoaded={() => console.log('[Navigation] Routes loaded')}
            />

            {/* ═══ Back button ═══ */}
            <Pressable
                style={[styles.backBtn, { top: insets.top + 8 }]}
                onPress={handleCancelNavigation}
                hitSlop={12}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* ═══ Right-side buttons (recenter) ═══ */}
            <View style={[styles.rightButtons, { bottom: 180 + insets.bottom }]}>
                <Pressable
                    style={styles.mapBtn}
                    onPress={handleRecenter}
                >
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
                {/* DEV: mock arrival */}
                <Pressable
                    style={[styles.mapBtn, { borderWidth: 1, borderColor: '#f59e0b' }]}
                    onPress={handleFinalDestinationArrival}
                >
                    <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800' }}>ARR</Text>
                </Pressable>
                {/* DEV: mock pickup arrival */}
                <Pressable
                    style={[styles.mapBtn, { borderWidth: 1, borderColor: '#3b82f6' }]}
                    onPress={handleWaypointArrival}
                >
                    <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: '800' }}>PKP</Text>
                </Pressable>
            </View>

            {/* ═══ Accept sheet (ring) — shown when driver has capacity ═══ */}
            {acceptSheetOrder && (
                <OrderAcceptSheet
                    order={acceptSheetOrder}
                    onAccept={handleAcceptOrder}
                    onSkip={handleSkipOrder}
                    accepting={accepting}
                    autoCountdown={acceptAutoCountdown}
                />
            )}

            {/* ═══ New order assigned toast ═══ */}
            {newOrderToast && (
                <View style={[styles.newOrderToast, { top: insets.top + 12 }]}>
                    <Ionicons name="bag-add-outline" size={18} color="#fff" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.newOrderToastTitle}>New order assigned</Text>
                        <Text style={styles.newOrderToastSub} numberOfLines={1}>
                            {newOrderToast.businessName}
                        </Text>
                    </View>
                    <Pressable onPress={() => setNewOrderToast(null)} hitSlop={8}>
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.65)" />
                    </Pressable>
                </View>
            )}

            {/* ═══ Today's earnings floating pill ═══ */}
            {(() => {
                const metrics = (metricsData as any)?.myDriverMetrics;
                const net = Number(metrics?.netEarningsToday ?? 0).toFixed(2);
                const count = metrics?.deliveredTodayCount ?? 0;
                return (
                    <View style={[styles.earningsPill, { top: insets.top + 12 }]}>
                        <Ionicons name="wallet-outline" size={14} color="#22c55e" />
                        <Text style={styles.earningsPillAmount}>€{net}</Text>
                        <View style={styles.earningsPillDivider} />
                        <Ionicons name="bicycle-outline" size={13} color="#94a3b8" />
                        <Text style={styles.earningsPillCount}>{count}</Text>
                    </View>
                );
            })()}

            {/* ═══ Order cards bar (bottom) ═══ */}
            {assignedOrders.length >= 1 && (
                <View style={[styles.bottomBar, { bottom: insets.bottom + 8 }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.barContent}
                        snapToInterval={225}
                        snapToAlignment="start"
                        decelerationRate="fast"
                    >
                        {assignedOrders.map((o: any) => {
                            const statusColor = STATUS_COLORS[o.status] ?? '#6B7280';
                            const isFocused = o.id === order?.id;
                            const bizName = o.businesses?.[0]?.business?.name ?? '?';
                            const initial = bizName.charAt(0).toUpperCase();
                            const earnings = Number(o.deliveryPrice ?? 0).toFixed(2);
                            const dropAddress = o.dropOffLocation?.address ?? '';
                            const shortDrop = dropAddress.split(',')[0] || '';
                            const isReady = o.status === 'READY';
                            const isPickingUp = markingPickedUpIds.has(o.id);

                            return (
                                <Pressable
                                    key={o.id}
                                    style={[
                                        styles.barCard,
                                        { borderLeftColor: statusColor },
                                        isFocused && styles.barCardFocused,
                                    ]}
                                    onPress={() => switchToOrder(o)}
                                >
                                    {/* Row 1: avatar + name/address + earnings */}
                                    <View style={styles.barCardTop}>
                                        <View style={[styles.barAvatar, { backgroundColor: statusColor }]}>
                                            <Text style={styles.barAvatarText}>{initial}</Text>
                                        </View>
                                        <View style={styles.barCardInfo}>
                                            <Text style={styles.barBizName} numberOfLines={1}>{bizName}</Text>
                                            {shortDrop ? (
                                                <Text style={styles.barDropAddress} numberOfLines={1}>{shortDrop}</Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.barEarnings}>
                                            <Text style={styles.barEarningsText}>€{earnings}</Text>
                                        </View>
                                    </View>

                                    {/* Row 2: status badge + action buttons */}
                                    <View style={styles.barCardBottom}>
                                        <View style={[styles.barStatusBadge, { backgroundColor: statusColor + '22' }]}>
                                            <View style={[styles.barStatusDot, { backgroundColor: statusColor }]} />
                                            <Text style={[styles.barStatusText, { color: statusColor }]}>
                                                {STATUS_LABELS[o.status] ?? o.status}
                                            </Text>
                                        </View>
                                        <View style={styles.barActions}>
                                            {isReady && (
                                                <Pressable
                                                    style={[styles.barActionBtn, styles.barPickupBtn]}
                                                    onPress={() => handleMarkPickedUp(o.id)}
                                                    disabled={isPickingUp}
                                                >
                                                    {isPickingUp
                                                        ? <ActivityIndicator size={10} color="#fff" />
                                                        : <Ionicons name="checkmark-outline" size={13} color="#fff" />
                                                    }
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ═══ Near-end action bar ═══ */}
            {showNearEndBar && !showPickupPanel && !showDeliveryPanel && (
                <View style={[styles.nearEndBar, { bottom: (assignedOrders.length > 1 ? 160 : 80) + insets.bottom }]}>
                    {/* Call customer */}
                    {!!order?.customerPhone && (
                        <Pressable
                            style={styles.nearEndBtn}
                            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                        >
                            <Ionicons name="call-outline" size={18} color="#22d3ee" />
                            <Text style={styles.nearEndBtnText}>Call Customer</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* ═══ Pickup arrival panel ═══ */}
            {showPickupPanel && (() => {
                const etaMins = durationRemainingS != null ? Math.ceil(durationRemainingS / 60) : null;
                return (
                    <PickupSlider
                        businessName={order?.businessName ?? ''}
                        etaMins={etaMins}
                        insetBottom={insets.bottom}
                        onConfirm={async () => {
                            try {
                                await updateOrderStatus({ variables: { id: order?.id, status: 'OUT_FOR_DELIVERY' } });
                            } catch { /* may already be updated */ }
                            setShowPickupPanel(false);
                            advanceToDropoff();
                        }}
                        onCancel={() => {
                            setShowPickupPanel(false);
                            clearNavigationLocation();
                            stopNavigation();
                            router.back();
                        }}
                    />
                );
            })()}

            {/* ═══ Full-screen dim veil shown during delivery success animation ═══ */}
            {showDeliveryPanel && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            backgroundColor: 'rgba(6, 9, 20, 0.82)',
                            opacity: mapDimOpacity,
                            zIndex: 105,
                        },
                    ]}
                />
            )}

            {/* ═══ Success card + confetti ═══ */}
            {showSuccessCard && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, { zIndex: 115, alignItems: 'center', justifyContent: 'center' }]}
                >
                    {/* Confetti particles — explode from card centre */}
                    {confettiData.map((p, i) => {
                        const cY = p.anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, -p.vy, -(p.vy * 0.72)] });
                        const cX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
                        const cOpacity = p.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
                        const cRotate  = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotation}deg`] });
                        return (
                            <Animated.View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size * p.aspect,
                                    backgroundColor: p.color,
                                    borderRadius: 2,
                                    opacity: cOpacity,
                                    transform: [{ translateX: cX }, { translateY: cY }, { rotate: cRotate }],
                                }}
                            />
                        );
                    })}

                    {/* The success card */}
                    <Animated.View
                        style={[
                            styles.successCard,
                            {
                                opacity: successCardOpacity,
                                transform: [{ translateY: successCardYTotal }, { scale: successCardScale }],
                            },
                        ]}
                    >
                        <View style={styles.successCardCircle}>
                            <Ionicons name="checkmark" size={52} color="#fff" />
                        </View>
                        <Text style={styles.successCardTitle}>Delivered!</Text>
                        <View style={styles.successCardBadge}>
                            <Ionicons name="cash" size={26} color="#78350f" />
                            <Text style={styles.successCardAmount}>+€{successCardPrice.toFixed(2)}</Text>
                            <Text style={styles.successCardLabel}>delivery earned 🎉</Text>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ═══ Delivery arrival panel ═══ */}
            {showDeliveryPanel && (() => {
                const fo = assignedOrders.find((o: any) => o.id === order?.id);
                return (
                <DeliverySlider
                    customerName={order?.customerName ?? ''}
                    customerPhone={order?.customerPhone ?? null}
                    arrivedNotifSent={arrivedNotifSent}
                    arrivedAt={arrivedAt}
                    notifiedAt={notifiedAt}
                    businesses={fo?.businesses ?? []}
                    orderPrice={fo?.orderPrice ?? 0}
                    deliveryPrice={fo?.deliveryPrice ?? 0}
                    totalPrice={fo?.totalPrice ?? 0}
                    insetBottom={insets.bottom}
                    onNotify={() => {
                        if (!order?.id || arrivedNotifSent) return;
                        setArrivedNotifSent(true);
                        setNotifiedAt(Date.now());
                        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                            .catch(() => {});
                    }}
                    onPingAgain={() => {
                        if (!order?.id) return;
                        setNotifiedAt(Date.now());
                        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                            .catch(() => {});
                    }}
                    onConfirm={async () => {
                        try {
                            await updateOrderStatus({ variables: { id: order?.id, status: 'DELIVERED' } });
                            await driverNotifyCustomer({ variables: { orderId: order?.id, event: 'DELIVERED' } });
                        } catch { /* navigate home regardless */ }
                        // Clean up success animation state before switching
                        setShowSuccessCard(false);
                        mapDimOpacity.setValue(0);
                        successCardOpacity.setValue(0);
                        successCardY.setValue(320);
                        successCardHoverY.setValue(0);
                        successCardScale.setValue(0.72);
                        setShowDeliveryPanel(false);
                        clearNavigationLocation();
                        stopNavigation();
                        // If there's another active order, switch to it instead of going back
                        const remaining = assignedOrders.filter((o: any) => o.id !== order?.id);
                        if (remaining.length > 0) {
                            switchToOrder(remaining[0]);
                        } else {
                            router.back();
                        }
                    }}
                    onSuccessAnimStart={() => {
                        // Dim the map behind everything
                        Animated.timing(mapDimOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();

                        // Spring the success card up from the panel area to screen centre
                        const fo2 = assignedOrders.find((o: any) => o.id === order?.id);
                        setSuccessCardPrice(fo2?.deliveryPrice ?? 0);
                        setTimeout(() => {
                            successCardY.setValue(320);
                            successCardHoverY.setValue(0);
                            successCardScale.setValue(0.72);
                            successCardOpacity.setValue(0);
                            setShowSuccessCard(true);
                            Animated.parallel([
                                Animated.timing(successCardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                                Animated.spring(successCardY,       { toValue: 0, tension: 46, friction: 8, useNativeDriver: true }),
                                Animated.spring(successCardScale,   { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
                            ]).start(() => {
                                // Hover loop on its own value — never touches successCardY so no reset flicker
                                Animated.loop(
                                    Animated.sequence([
                                        Animated.timing(successCardHoverY, { toValue: -14, duration: 700, useNativeDriver: true }),
                                        Animated.timing(successCardHoverY, { toValue: 0,   duration: 700, useNativeDriver: true }),
                                    ]),
                                ).start();
                            });
                            // Confetti burst (staggered, JS driver)
                            confettiData.forEach((p, i) => {
                                p.anim.setValue(0);
                                setTimeout(() => {
                                    Animated.timing(p.anim, { toValue: 1, duration: 1200 + i * 10, useNativeDriver: false }).start();
                                }, i * 18);
                            });
                        }, 280);
                    }}
                    onCancel={async (reason) => {
                        try {
                            await updateOrderStatus({ variables: { id: order?.id, status: 'CANCELLED' } });
                        } catch { /* navigate home regardless */ }
                        // Clean up success animation state
                        setShowSuccessCard(false);
                        mapDimOpacity.setValue(0);
                        successCardOpacity.setValue(0);
                        successCardY.setValue(320);
                        successCardHoverY.setValue(0);
                        successCardScale.setValue(0.72);
                        setShowDeliveryPanel(false);
                        clearNavigationLocation();
                        stopNavigation();
                        // If there's another active order, switch to it instead of going back
                        const remaining = assignedOrders.filter((o: any) => o.id !== order?.id);
                        if (remaining.length > 0) {
                            switchToOrder(remaining[0]);
                        } else {
                            router.back();
                        }
                    }}
                />
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    navView: {
        flex: 1,
    },
    successCard: {
        backgroundColor: '#0f172a',
        borderRadius: 28,
        paddingHorizontal: 38,
        paddingVertical: 30,
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.55,
        shadowRadius: 40,
        elevation: 30,
    },
    successCardCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
        elevation: 20,
    },
    successCardTitle: {
        color: '#f1f5f9',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successCardBadge: {
        backgroundColor: '#f59e0b',
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 3,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 18,
        elevation: 18,
    },
    successCardAmount: {
        color: '#0c0a00',
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successCardLabel: {
        color: 'rgba(0,0,0,0.50)',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },

    /* ── Loading state ── */
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    /* ── Near-end action bar ── */
    nearEndBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 10,
        zIndex: 90,
    },
    nearEndBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(10,15,26,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    nearEndBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    nearEndBtnText: {
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '700',
    },

    /* ── Arrived notify button (inside delivery panel header) ── */
    arrivedNotifBtn: {
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
    arrivedNotifBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    arrivedNotifText: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: '700',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 100,
        padding: 8,
    },

    /* ── Cancel button (loading state) ── */
    cancelBtn: {
        position: 'absolute',
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Control buttons ── */
    controlBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBtnExit: {
        backgroundColor: 'rgba(239,68,68,0.7)',
    },

    /* ── Right-side buttons ── */
    rightButtons: {
        position: 'absolute',
        right: 16,
        alignItems: 'center',
        gap: 10,
        zIndex: 50,
    },
    mapBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
    },

    /* ── Order cards bar ── */
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
    },
    barContent: {
        paddingHorizontal: 12,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    barCard: {
        width: 215,
        borderRadius: 14,
        backgroundColor: 'rgba(10,12,24,0.88)',
        borderLeftWidth: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        padding: 10,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 12,
    },
    barCardFocused: {
        backgroundColor: 'rgba(30,27,75,0.92)',
        borderColor: 'rgba(139,92,246,0.4)',
    },
    barCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    barAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    barAvatarText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    barCardInfo: {
        flex: 1,
        gap: 2,
    },
    barBizName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#e2e8f0',
    },
    barDropAddress: {
        fontSize: 10,
        color: '#64748b',
    },
    barEarnings: {
        backgroundColor: 'rgba(5, 46, 22, 0.9)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexShrink: 0,
    },
    barEarningsText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#22c55e',
    },
    barCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    barStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    barStatusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    barStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    barActions: {
        flexDirection: 'row',
        gap: 5,
    },
    barActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barPickupBtn: {
        backgroundColor: '#16a34a',
    },

    /* ── Arrival panels ── */
    arrivalPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 18,
        zIndex: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
        elevation: 28,
    },
    arrivalPanelHandle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    arrivalIconRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f620',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrivalTitle: {
        color: '#f1f5f9',
        fontSize: 18,
        fontWeight: '800',
    },
    arrivalSub: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    arrivalCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 17,
        borderRadius: 16,
        marginTop: 4,
    },
    arrivalCTAText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    arrivalSecondary: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 2,
    },
    arrivalSecondaryText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },

    /* ── New order assigned toast ── */
    newOrderToast: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#1e293b',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
        zIndex: 150,
        borderLeftWidth: 3,
        borderLeftColor: '#6366f1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
    },
    newOrderToastTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    newOrderToastSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 1,
    },

    /* ── Earnings floating pill ── */
    earningsPill: {
        position: 'absolute',
        right: 16,
        zIndex: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(10,12,24,0.88)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    earningsPillAmount: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '800',
    },
    earningsPillDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 2,
    },
    earningsPillCount: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
    },
});
