import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, ActivityIndicator } from 'react-native';
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
    onAcceptAndNavigate?: (orderId: string) => void;
    onSkip: () => void;
    accepting?: boolean;
    /** When false, no countdown timer runs (manual pick from pool). Default true. */
    autoCountdown?: boolean;
    onHeightChange?: (h: number) => void;
}

export function OrderAcceptSheet({
    order,
    onAccept,
    onAcceptAndNavigate,
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
    // Tick every 30s so ETA display stays live
    const [nowTs, setNowTs] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

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
    const allItems = (order.businesses ?? []).flatMap((b: any) => b.items ?? []);
    const itemCount = allItems.length;
    const dropAddress = order.dropOffLocation?.address ?? '';
    const shortAddress = dropAddress.split(',')[0] || 'See map';
    const deliveryFee = Number(order.deliveryPrice ?? 0).toFixed(2);

    // ETA: descriptive label for food readiness
    const etaLabel = (() => {
        if (order.status === 'READY') return 'Ready now';
        if (order.estimatedReadyAt) {
            const diff = Math.ceil((new Date(order.estimatedReadyAt).getTime() - nowTs) / 60_000);
            if (diff > 0) return `Ready in ~${diff} min`;
            return 'Almost ready';
        }
        if (order.status === 'PREPARING') return 'Preparing';
        return null;
    })();
    const etaIsReady = order.status === 'READY';

    const ringOffset = (RING_C * (COUNTDOWN_DURATION - countdown)) / COUNTDOWN_DURATION;
    const isUrgent = countdown <= 5;

    return (
        <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
            <View
                style={[styles.sheet, { paddingTop: insets.top + 4 }]}
                onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
            >
                {/* Top accent bar */}
                <View style={styles.accentLine} />

                {/* Draggable body */}
                <View {...panResponder.panHandlers} style={styles.dragBody}>

                    {/* â”€â”€ Header: business name + label + countdown â”€â”€ */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.headerLabel}>NEW ORDER</Text>
                            <Text style={styles.bizName} numberOfLines={1}>{bizName}</Text>
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

                    {/* â”€â”€ Stats row: ETA Â· Earnings Â· Drop-off â”€â”€ */}
                    <View style={styles.statsRow}>
                        {/* ETA */}
                        {etaLabel ? (
                            <View style={[styles.statChip, etaIsReady ? styles.statChipReady : styles.statChipEta]}>
                                <Ionicons
                                    name={etaIsReady ? 'checkmark-circle' : 'time-outline'}
                                    size={13}
                                    color={etaIsReady ? '#4ade80' : '#fb923c'}
                                />
                                <Text style={[styles.statChipText, { color: etaIsReady ? '#4ade80' : '#fb923c' }]}>
                                    {etaLabel}
                                </Text>
                            </View>
                        ) : null}

                        {/* Earnings */}
                        <View style={[styles.statChip, styles.statChipFee]}>
                            <Ionicons name="wallet-outline" size={13} color="#22d3ee" />
                            <View>
                                <Text style={styles.statChipEarnLabel}>You earn</Text>
                                <Text style={[styles.statChipText, { color: '#22d3ee' }]}>€{deliveryFee}</Text>
                            </View>
                        </View>

                        {/* Drop-off */}
                        <View style={[styles.statChip, styles.statChipDrop, { flex: 1 }]}>
                            <Ionicons name="location-outline" size={13} color="#a78bfa" />
                            <Text style={[styles.statChipText, styles.statChipDropText, { color: '#c4b5fd' }]} numberOfLines={1}>
                                {shortAddress}
                            </Text>
                        </View>
                    </View>

                    {/* â”€â”€ Items toggle row â”€â”€ */}
                    <Pressable
                        style={[styles.itemsToggle, itemsExpanded && styles.itemsToggleOpen]}
                        onPress={() => setItemsExpanded(v => !v)}
                    >
                        <View style={styles.itemsToggleLeft}>
                            <Ionicons name="bag-handle-outline" size={15} color="#94a3b8" />
                            <Text style={styles.itemsToggleText}>
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                        <Ionicons
                            name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color="#475569"
                        />
                    </Pressable>

                    {/* Items expanded list */}
                    {itemsExpanded && allItems.length > 0 && (
                        <View style={styles.itemsList}>
                            {allItems.slice(0, 8).map((item: any, idx: number) => (
                                <View key={idx} style={[styles.itemRow, idx < allItems.slice(0, 8).length - 1 && styles.itemRowBorder]}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.itemQtyBadge}>
                                        <Text style={styles.itemQtyText}>x{item.quantity}</Text>
                                    </View>
                                </View>
                            ))}
                            {allItems.length > 8 && (
                                <Text style={styles.itemsMore}>+{allItems.length - 8} more</Text>
                            )}
                        </View>
                    )}

                    {/* Driver notes */}
                    {!!order.driverNotes && (
                        <View style={styles.notesRow}>
                            <Ionicons name="warning-outline" size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                            <Text style={styles.notesText}>{order.driverNotes}</Text>
                        </View>
                    )}

                    {/* â”€â”€ CTAs â”€â”€ */}
                    <View style={styles.ctaRow}>
                        <Pressable onPress={onSkip} style={styles.skipBtn} disabled={accepting}>
                            <Text style={styles.skipText}>{autoCountdown ? 'Skip' : 'Close'}</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleAccept}
                            disabled={accepting}
                            style={[styles.acceptBtn, accepting && { opacity: 0.65 }]}
                        >
                            {accepting ? (
                                <ActivityIndicator size={16} color="#0f172a" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color="#0f172a" />
                                    <Text style={styles.acceptText}>Accept</Text>
                                </>
                            )}
                        </Pressable>

                        {!!onAcceptAndNavigate && (
                            <Pressable
                                onPress={handleAcceptAndNavigate}
                                disabled={accepting}
                                style={[styles.navBtn, accepting && { opacity: 0.65 }]}
                            >
                                <Ionicons name="navigate" size={16} color="#fff" />
                                <Text style={styles.navBtnText}>Navigate</Text>
                            </Pressable>
                        )}
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
        backgroundColor: '#080d18',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.65,
        shadowRadius: 24,
        elevation: 30,
        overflow: 'hidden',
    },
    accentLine: {
        height: 3,
        marginHorizontal: 0,
        backgroundColor: '#22d3ee',
        opacity: 0.9,
    },
    dragBody: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 8,
    },

    /* Header */
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    headerLeft: {
        flex: 1,
        marginRight: 12,
    },
    headerLabel: {
        color: '#22d3ee',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    bizName: {
        color: '#f1f5f9',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
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

    /* Stats chips row */
    statsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
        flexWrap: 'nowrap',
        alignItems: 'center',
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statChipEarnLabel: {
        color: 'rgba(34,211,238,0.55)',
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 10,
    },
    statChipEta: {
        backgroundColor: 'rgba(251,146,60,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(251,146,60,0.25)',
    },
    statChipReady: {
        backgroundColor: 'rgba(74,222,128,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(74,222,128,0.25)',
    },
    statChipFee: {
        backgroundColor: 'rgba(34,211,238,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.18)',
    },
    statChipDrop: {
        backgroundColor: 'rgba(167,139,250,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.18)',
        flexShrink: 1,
    },
    statChipDropText: {
        flexShrink: 1,
    },

    /* Items toggle */
    itemsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 6,
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
        gap: 7,
    },
    itemsToggleText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
    },

    /* Items expanded */
    itemsList: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    itemName: {
        color: '#cbd5e1',
        fontSize: 13,
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
        fontSize: 12,
        fontWeight: '700',
    },
    itemsMore: {
        color: '#475569',
        fontSize: 11,
        paddingVertical: 6,
        textAlign: 'center',
    },

    /* Driver notes */
    notesRow: {
        backgroundColor: 'rgba(251,191,36,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.16)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
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

    /* CTAs */
    ctaRow: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 6,
        marginTop: 2,
    },
    skipBtn: {
        width: 64,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    skipText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '700',
    },
    acceptBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    acceptText: {
        color: '#0a0f1a',
        fontSize: 14,
        fontWeight: '800',
    },
    navBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    navBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
});
