import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COUNTDOWN_DURATION = 15;
const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

interface Props {
    order: any;
    onAccept: (orderId: string) => void;
    onSkip: () => void;
    accepting?: boolean;
    /** When false, no countdown timer runs (manual pick from pool). Default true. */
    autoCountdown?: boolean;
    onHeightChange?: (h: number) => void;
}

export function OrderAcceptSheet({
    order,
    onAccept,
    onSkip,
    accepting = false,
    autoCountdown = true,
    onHeightChange,
}: Props) {
    const insets = useSafeAreaInsets();
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const slideY = useRef(new Animated.Value(-500)).current;

    useEffect(() => {
        // Slide in
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

    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const itemCount = (order.businesses ?? []).reduce(
        (acc: number, b: any) => acc + (b.items?.length ?? 0),
        0,
    );
    const dropAddress = order.dropOffLocation?.address ?? '';
    const shortAddress = dropAddress.split(',')[0] || 'See map';
    const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);

    const ringOffset = (RING_C * (COUNTDOWN_DURATION - countdown)) / COUNTDOWN_DURATION;
    const isUrgent = countdown <= 5;

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View
                style={[styles.sheet, { paddingTop: insets.top + 4 }]}
                onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
            >
                {/* Cyan accent line */}
                <View style={styles.accentLine} />

                {/* Draggable body */}
                <View {...panResponder.panHandlers} style={styles.dragBody}>
                    {/* Header row */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerText}>
                            <Text style={styles.bizName} numberOfLines={1}>
                                {bizName}
                            </Text>
                        </View>

                        {autoCountdown && (
                            <View style={styles.ringContainer}>
                                <Svg width={48} height={48} viewBox="0 0 48 48">
                                    <Circle
                                        cx={24} cy={24} r={RING_R}
                                        stroke="rgba(255,255,255,0.07)"
                                        strokeWidth={4} fill="none"
                                    />
                                    <Circle
                                        cx={24} cy={24} r={RING_R}
                                        stroke={isUrgent ? '#f87171' : '#22d3ee'}
                                        strokeWidth={4} fill="none"
                                        strokeDasharray={`${RING_C} ${RING_C}`}
                                        strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                        rotation="-90" origin="24, 24"
                                    />
                                </Svg>
                                <Text style={[styles.countdownText, isUrgent && { color: '#f87171' }]}>
                                    {countdown}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Info tiles */}
                    <View style={styles.tilesRow}>
                        <Pressable
                            style={styles.tile}
                            onPress={!autoCountdown ? () => setItemsExpanded(v => !v) : undefined}
                        >
                            <Ionicons name="bag-handle-outline" size={17} color="#94a3b8" />
                            <Text style={styles.tileValue}>{itemCount}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Text style={styles.tileLabel}>Items</Text>
                                {!autoCountdown && (
                                    <Ionicons
                                        name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={9}
                                        color="#64748b"
                                    />
                                )}
                            </View>
                        </Pressable>

                        <View style={[styles.tile, styles.tileFee]}>
                            <Ionicons name="cash-outline" size={17} color="#22d3ee" />
                            <Text style={[styles.tileValue, { color: '#22d3ee' }]}>€{deliveryFee}</Text>
                            <Text style={styles.tileLabel}>Delivery</Text>
                        </View>

                        <View style={[styles.tile, { flex: 2, alignItems: 'flex-start', justifyContent: 'center' }]}>
                            <Text style={styles.tileLabel}>Drop-off</Text>
                            <Text style={styles.addressText} numberOfLines={2}>{shortAddress}</Text>
                        </View>
                    </View>

                    {/* Driver notes */}
                    {!!order.driverNotes && (
                        <View style={styles.notesRow}>
                            <Ionicons name="warning-outline" size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                            <Text style={styles.notesText}>{order.driverNotes}</Text>
                        </View>
                    )}

                    {/* Items list (expandable, pool mode only) */}
                    {!autoCountdown && itemsExpanded && order.businesses && (
                        <View style={styles.itemsList}>
                            <Text style={styles.tileLabel}>Order Contents</Text>
                            {order.businesses
                                .flatMap((b: any) => b.items ?? [])
                                .slice(0, 6)
                                .map((item: any, idx: number) => (
                                    <View key={idx} style={styles.itemRow}>
                                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.itemQty}>×{item.quantity}</Text>
                                    </View>
                                ))}
                        </View>
                    )}

                    {/* CTAs */}
                    <View style={styles.ctaRow}>
                        <Pressable onPress={onSkip} style={styles.skipBtn}>
                            <Text style={styles.skipText}>{autoCountdown ? 'Skip' : 'Close'}</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleAccept}
                            disabled={accepting}
                            style={[styles.acceptBtn, accepting && { opacity: 0.65 }]}
                        >
                            {accepting ? (
                                <Text style={styles.acceptText}>Accepting…</Text>
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#0f172a" />
                                    <Text style={styles.acceptText}>Accept Order</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
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
        zIndex: 300,
    },
    sheet: {
        backgroundColor: '#0a0f1a',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 28,
        overflow: 'hidden',
    },
    accentLine: {
        height: 2,
        marginHorizontal: 16,
        borderRadius: 1,
        marginBottom: 4,
        backgroundColor: '#22d3ee',
        opacity: 0.8,
    },
    dragBody: {
        paddingHorizontal: 16,
    },
    handle: {
        width: 32,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 6,
        marginBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    headerText: {
        flex: 1,
        marginRight: 12,
    },
    label: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        marginBottom: 4,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 17,
        fontWeight: '800',
    },
    ringContainer: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownText: {
        position: 'absolute',
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '800',
    },
    tilesRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    tile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        padding: 8,
        alignItems: 'center',
        gap: 2,
    },
    tileFee: {
        backgroundColor: 'rgba(34,211,238,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.14)',
    },
    tileValue: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: '800',
    },
    tileLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    addressText: {
        color: '#f1f5f9',
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
        marginTop: 1,
    },
    notesRow: {
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.18)',
        borderRadius: 10,
        padding: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    notesText: {
        color: '#fbbf24',
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    itemsList: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        gap: 6,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemName: {
        color: '#cbd5e1',
        fontSize: 13,
        flex: 1,
    },
    itemQty: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    skipBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
    },
    skipText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '700',
    },
    acceptBtn: {
        flex: 2.5,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 10,
    },
    acceptText: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '800',
    },
});
