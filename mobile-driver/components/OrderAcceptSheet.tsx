import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
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
}

export function OrderAcceptSheet({ order, onAccept, onSkip, accepting = false }: Props) {
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
    const translateY = useSharedValue(520);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        translateY.value = withSpring(0, { damping: 20, stiffness: 190 });
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
    }, [order?.id]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

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

    // Countdown ring: full at 15s, empty at 0s
    const ringOffset = (RING_C * (COUNTDOWN_DURATION - countdown)) / COUNTDOWN_DURATION;
    const isUrgent = countdown <= 5;

    return (
        <Animated.View
            style={[
                { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200 },
                animStyle,
            ]}
        >
            <View
                style={{
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
                }}
            >
                {/* Handle */}
                <View
                    style={{
                        width: 36,
                        height: 4,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        borderRadius: 2,
                        alignSelf: 'center',
                        marginBottom: 16,
                    }}
                />

                {/* Header row */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 18,
                    }}
                >
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                            style={{
                                color: '#64748b',
                                fontSize: 10,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 1.4,
                                marginBottom: 4,
                            }}
                        >
                            New Order Available
                        </Text>
                        <Text
                            style={{ color: '#f1f5f9', fontSize: 21, fontWeight: '800' }}
                            numberOfLines={1}
                        >
                            {bizName}
                        </Text>
                    </View>

                    {/* Countdown ring */}
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Svg width={64} height={64} viewBox="0 0 64 64">
                            <Circle
                                cx={32}
                                cy={32}
                                r={RING_R}
                                stroke="rgba(255,255,255,0.07)"
                                strokeWidth={5}
                                fill="none"
                            />
                            <Circle
                                cx={32}
                                cy={32}
                                r={RING_R}
                                stroke={isUrgent ? '#f87171' : '#22d3ee'}
                                strokeWidth={5}
                                fill="none"
                                strokeDasharray={`${RING_C} ${RING_C}`}
                                strokeDashoffset={ringOffset}
                                strokeLinecap="round"
                                rotation="-90"
                                origin="32, 32"
                            />
                        </Svg>
                        <Text
                            style={{
                                position: 'absolute',
                                color: isUrgent ? '#f87171' : '#f1f5f9',
                                fontSize: 17,
                                fontWeight: '800',
                            }}
                        >
                            {countdown}
                        </Text>
                    </View>
                </View>

                {/* Info tiles */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: 14,
                            padding: 12,
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <Ionicons name="bag-handle-outline" size={17} color="#94a3b8" />
                        <Text style={{ color: '#f1f5f9', fontSize: 17, fontWeight: '800' }}>
                            {itemCount}
                        </Text>
                        <Text
                            style={{
                                color: '#64748b',
                                fontSize: 9,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.8,
                            }}
                        >
                            Items
                        </Text>
                    </View>

                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(34,211,238,0.07)',
                            borderRadius: 14,
                            padding: 12,
                            alignItems: 'center',
                            gap: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(34,211,238,0.14)',
                        }}
                    >
                        <Ionicons name="cash-outline" size={17} color="#22d3ee" />
                        <Text style={{ color: '#22d3ee', fontSize: 17, fontWeight: '800' }}>
                            €{deliveryFee}
                        </Text>
                        <Text
                            style={{
                                color: '#64748b',
                                fontSize: 9,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.8,
                            }}
                        >
                            Delivery
                        </Text>
                    </View>

                    <View
                        style={{
                            flex: 2,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: 14,
                            padding: 12,
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: '#64748b',
                                fontSize: 9,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.8,
                                marginBottom: 3,
                            }}
                        >
                            Drop-off
                        </Text>
                        <Text
                            style={{ color: '#f1f5f9', fontSize: 12, fontWeight: '600', lineHeight: 18 }}
                            numberOfLines={2}
                        >
                            {shortAddress}
                        </Text>
                    </View>
                </View>

                {/* Driver notes warning */}
                {!!order.driverNotes && (
                    <View
                        style={{
                            backgroundColor: 'rgba(251,191,36,0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(251,191,36,0.18)',
                            borderRadius: 12,
                            padding: 10,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}
                    >
                        <Ionicons name="warning-outline" size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                        <Text style={{ color: '#fbbf24', fontSize: 12, flex: 1, lineHeight: 18 }}>
                            {order.driverNotes}
                        </Text>
                    </View>
                )}

                {/* CTAs */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                        onPress={onSkip}
                        style={{
                            flex: 1,
                            height: 58,
                            borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.09)',
                        }}
                    >
                        <Text style={{ color: '#94a3b8', fontSize: 15, fontWeight: '700' }}>Skip</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleAccept}
                        disabled={accepting}
                        style={[
                            {
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
                            accepting && { opacity: 0.65 },
                        ]}
                    >
                        {accepting ? (
                            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                                Accepting…
                            </Text>
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#0f172a" />
                                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                                    Accept Order
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}
