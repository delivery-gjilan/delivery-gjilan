import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OrderStatus, STATUS_COLORS, STATUS_ICONS } from './types';

type StatusFilter = 'PENDING' | 'PREPARING' | 'READY';

interface StatusRailProps {
    activeFilter: StatusFilter;
    counts: Record<StatusFilter, number>;
    tick: number;
    onSelect: (status: StatusFilter) => void;
}

const FILTERS: StatusFilter[] = ['PENDING', 'PREPARING', 'READY'];

export function StatusRail({ activeFilter, counts, tick, onSelect }: StatusRailProps) {
    const { t } = useTranslation();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const hasPending = counts.PENDING > 0;

    useEffect(() => {
        if (!hasPending) {
            pulseAnim.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.35, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [hasPending, pulseAnim]);

    const statusLabels: Record<StatusFilter, string> = {
        PENDING: t('orders.new_order', 'New'),
        PREPARING: t('orders.preparing', 'Prep'),
        READY: t('orders.ready_pickup', 'Ready'),
    };

    return (
        <View
            style={{
                width: 76,
                backgroundColor: '#0f172a',
                borderRightWidth: 1,
                borderRightColor: 'rgba(255,255,255,0.06)',
                paddingTop: 8,
                paddingBottom: 8,
            }}
        >
            {FILTERS.map((status) => {
                const isActive = activeFilter === status;
                const color = STATUS_COLORS[status];
                const count = counts[status];
                const isPendingTab = status === 'PENDING';
                const blinkOn = isPendingTab && hasPending && tick % 2 === 0;
                const dotColor = blinkOn ? '#ef4444' : color;

                return (
                    <TouchableOpacity
                        key={status}
                        onPress={() => onSelect(status)}
                        activeOpacity={0.75}
                        style={{
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 4,
                            marginHorizontal: 6,
                            marginBottom: 4,
                            borderRadius: 14,
                            backgroundColor: isActive ? `${color}18` : 'transparent',
                            borderLeftWidth: isActive ? 3 : 0,
                            borderLeftColor: isActive ? color : 'transparent',
                        }}
                    >
                        {/* Dot / pulse ring for pending */}
                        {isPendingTab && hasPending ? (
                            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                                <Animated.View
                                    style={{
                                        position: 'absolute',
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: '#ef4444',
                                        opacity: pulseAnim,
                                    }}
                                />
                                <Ionicons name={STATUS_ICONS[status] as any} size={16} color="#fff" />
                            </View>
                        ) : (
                            <View
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: isActive ? `${color}30` : 'rgba(255,255,255,0.06)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 4,
                                }}
                            >
                                <Ionicons name={STATUS_ICONS[status] as any} size={15} color={isActive ? color : '#64748b'} />
                            </View>
                        )}

                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isActive ? color : '#64748b',
                                textAlign: 'center',
                            }}
                            numberOfLines={1}
                        >
                            {statusLabels[status]}
                        </Text>

                        {/* Count badge */}
                        {count > 0 && (
                            <View
                                style={{
                                    marginTop: 3,
                                    minWidth: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: isPendingTab && hasPending ? '#ef4444' : color,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingHorizontal: 5,
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                                    {count}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
