import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '@/hooks/useTranslations';

const PICKUP_TRACK_H = 62;
const PICKUP_THUMB = 52;

interface Props {
    businessName: string;
    etaMins: number | null;
    prepMinsLeft: number | null;
    insetBottom: number;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function PickupSlider({
    businessName,
    etaMins,
    prepMinsLeft,
    insetBottom,
    onConfirm,
    onCancel,
}: Props) {
    const { t } = useTranslations();
    const s = t.pickup;
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
        splashConfetti.forEach((p, i) => {
            setTimeout(() => {
                Animated.timing(p.anim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
            }, i * 28);
        });
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
                            setTimeout(async () => { await onConfirm(); }, 1900);
                        });
                } else {
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
                }
            },
        }),
    ).current;

    return (
        <View style={[styles.panel, { paddingBottom: insetBottom + 16 }]}>
            <View style={styles.handle} />

            {/* Header row */}
            <View style={styles.header}>
                <View style={styles.iconRing}>
                    <Ionicons name="bag-check-outline" size={22} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{s.arrived_at_pickup}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{businessName}</Text>
                </View>
                {etaMins != null && (
                    <Animated.View
                        style={[
                            styles.etaBadge,
                            { transform: [{ scale: etaScale }, { translateY: etaHoverY }] },
                        ]}
                    >
                        <Ionicons name="navigate-circle-outline" size={20} color="#0ea5e9" />
                        <Text style={styles.etaValue}>{etaMins} {s.min}</Text>
                        <Text style={styles.etaLabel}>{s.to_dropoff}</Text>
                    </Animated.View>
                )}
            </View>

            {prepMinsLeft != null && (
                <View style={styles.prepRow}>
                    <Ionicons name="restaurant-outline" size={14} color="#06b6d4" />
                    <Text style={styles.prepText}>
                        {prepMinsLeft === 0
                            ? s.food_almost_ready
                            : s.food_ready_in.replace('{{min}}', String(prepMinsLeft))}
                    </Text>
                </View>
            )}

            <View
                style={styles.track}
                onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
            >
                <Animated.View style={[styles.fill, { opacity: fillOpacity }]} />
                <Animated.Text style={[styles.trackLabel, { opacity: labelOpacity }]}>
                    {s.slide_confirm}
                </Animated.Text>
                <Animated.View
                    style={[styles.thumb, done && styles.thumbDone, { transform: [{ translateX }] }]}
                    {...pan.panHandlers}
                >
                    <Ionicons name={done ? 'checkmark' : 'bag-check'} size={26} color="#fff" />
                </Animated.View>
            </View>

            {!done && (
                <Pressable style={styles.secondary} onPress={onCancel}>
                    <Text style={styles.secondaryText}>{s.cancel_navigation}</Text>
                </Pressable>
            )}

            {splashVisible && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, styles.splashOverlay]}
                >
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
                    <Animated.View
                        style={[
                            styles.splashCard,
                            {
                                opacity: splashOpacity,
                                transform: [{ scale: splashScale }, { translateY: splashHoverY }],
                            },
                        ]}
                    >
                        <View style={styles.splashIconRing}>
                            <Ionicons name="navigate" size={42} color="#fff" />
                        </View>
                        <Text style={styles.splashTitle}>{s.on_your_way}</Text>
                        {etaMins != null && (
                            <View style={styles.splashBadge}>
                                <Text style={styles.splashEtaNum}>{etaMins} {s.min}</Text>
                                <Text style={styles.splashEtaLabel}>{s.to_dropoff}</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
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
    prepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(6,182,212,0.08)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.2)',
    },
    prepText: {
        color: '#22d3ee',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
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
