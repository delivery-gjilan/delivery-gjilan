import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const COUNTDOWN_DURATION = 15;
const RING_R = 28;
const RING_C = 2 * Math.PI * RING_R;

interface Props {
    order: any;
    onAccept: (orderId: string) => void;
    onSkip: () => void;
    accepting?: boolean;
    /** When false, no countdown timer runs (manual pick from pool). Default true. */
    autoCountdown?: boolean;
}

export function OrderAcceptSheet({
    order,
    onAccept,
    onSkip,
    accepting = false,
    autoCountdown = true,
}: Props) {
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        <View style={styles.root}>
            <View style={styles.sheet}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header row */}
                <View style={styles.headerRow}>
                    <View style={styles.headerText}>
                        <Text style={styles.label}>
                            {autoCountdown ? 'New Order Available' : 'Order Details'}
                        </Text>
                        <Text style={styles.bizName} numberOfLines={1}>
                            {bizName}
                        </Text>
                    </View>

                    {autoCountdown && (
                        <View style={styles.ringContainer}>
                            <Svg width={64} height={64} viewBox="0 0 64 64">
                                <Circle
                                    cx={32} cy={32} r={RING_R}
                                    stroke="rgba(255,255,255,0.07)"
                                    strokeWidth={5} fill="none"
                                />
                                <Circle
                                    cx={32} cy={32} r={RING_R}
                                    stroke={isUrgent ? '#f87171' : '#22d3ee'}
                                    strokeWidth={5} fill="none"
                                    strokeDasharray={`${RING_C} ${RING_C}`}
                                    strokeDashoffset={ringOffset}
                                    strokeLinecap="round"
                                    rotation="-90" origin="32, 32"
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
                    <View style={styles.tile}>
                        <Ionicons name="bag-handle-outline" size={17} color="#94a3b8" />
                        <Text style={styles.tileValue}>{itemCount}</Text>
                        <Text style={styles.tileLabel}>Items</Text>
                    </View>

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

                {/* Items list (show when manual/from pool) */}
                {!autoCountdown && order.businesses && (
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
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
    },
    sheet: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
        elevation: 28,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
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
        fontSize: 21,
        fontWeight: '800',
    },
    ringContainer: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownText: {
        position: 'absolute',
        color: '#f1f5f9',
        fontSize: 17,
        fontWeight: '800',
    },
    tilesRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    tileFee: {
        backgroundColor: 'rgba(34,211,238,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(34,211,238,0.14)',
    },
    tileValue: {
        color: '#f1f5f9',
        fontSize: 17,
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
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
        marginTop: 3,
    },
    notesRow: {
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.18)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 16,
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
        gap: 10,
    },
    skipBtn: {
        flex: 1,
        height: 58,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
    },
    skipText: {
        color: '#94a3b8',
        fontSize: 15,
        fontWeight: '700',
    },
    acceptBtn: {
        flex: 2.5,
        height: 58,
        borderRadius: 18,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
        elevation: 12,
    },
    acceptText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '800',
    },
});
