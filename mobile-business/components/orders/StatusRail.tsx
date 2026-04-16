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
    isStoreClosed: boolean;
    avgPrepTime: number;
    directDispatchEnabled?: boolean;
    hasActiveDirectDispatchOrders?: boolean;
    controlsDisabled?: boolean;
    onSelect: (status: StatusFilter) => void;
    onToggleStore: () => void;
    onEditPrepTime: () => void;
    onOpenDirectDispatch: () => void;
}

const FILTERS: StatusFilter[] = ['PENDING', 'PREPARING', 'READY'];

export function StatusRail({
    activeFilter,
    counts,
    tick,
    isStoreClosed,
    avgPrepTime,
    directDispatchEnabled = false,
    hasActiveDirectDispatchOrders = false,
    controlsDisabled = false,
    onSelect,
    onToggleStore,
    onEditPrepTime,
    onOpenDirectDispatch,
}: StatusRailProps) {
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

    const storeColor = isStoreClosed ? '#ef4444' : '#10b981';
    const storeLabel = isStoreClosed
        ? t('orders.store_closed', 'Store Closed')
        : t('orders.store_open', 'Store Open');

    return (
        <View
            style={{
                width: 88,
                flexShrink: 0,
                backgroundColor: '#09090b',
                borderRightWidth: 1,
                borderRightColor: 'rgba(255,255,255,0.06)',
                paddingTop: 8,
                paddingBottom: 8,
                justifyContent: 'space-between',
            }}
        >
            <View>
                {FILTERS.map((status) => {
                    const isActive = activeFilter === status;
                    const color = STATUS_COLORS[status];
                    const count = counts[status];
                    const isPendingTab = status === 'PENDING';

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
                            {isPendingTab && hasPending ? (
                                <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                                    <Animated.View
                                        style={{
                                            position: 'absolute',
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: '#ef4444',
                                            opacity: tick % 2 === 0 ? pulseAnim : 1,
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

            <View style={{ marginTop: 10, paddingHorizontal: 6 }}>
                <View
                    style={{
                        height: 1,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        marginBottom: 10,
                    }}
                />

                <TouchableOpacity
                    onPress={onToggleStore}
                    disabled={controlsDisabled}
                    activeOpacity={0.8}
                    style={{
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        borderRadius: 14,
                        backgroundColor: `${storeColor}18`,
                        borderWidth: 1,
                        borderColor: `${storeColor}3d`,
                        opacity: controlsDisabled ? 0.6 : 1,
                        marginBottom: 8,
                    }}
                >
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: `${storeColor}25`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 4,
                        }}
                    >
                        <Ionicons
                            name={isStoreClosed ? 'close-circle' : 'checkmark-circle'}
                            size={17}
                            color={storeColor}
                        />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#cbd5e1', textAlign: 'center' }}>
                        {t('orders.store', 'Store')}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: storeColor, textAlign: 'center', marginTop: 2 }} numberOfLines={2}>
                        {storeLabel}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onEditPrepTime}
                    disabled={controlsDisabled}
                    activeOpacity={0.8}
                    style={{
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        borderRadius: 14,
                        backgroundColor: '#3b82f618',
                        borderWidth: 1,
                        borderColor: '#3b82f63d',
                        opacity: controlsDisabled ? 0.6 : 1,
                    }}
                >
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: '#3b82f625',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 4,
                        }}
                    >
                        <Ionicons name="timer-outline" size={17} color="#60a5fa" />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#cbd5e1', textAlign: 'center' }}>
                        {t('orders.avg_prep', 'Avg Prep')}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#60a5fa', textAlign: 'center', marginTop: 2 }}>
                        {avgPrepTime}m
                    </Text>
                </TouchableOpacity>

                {directDispatchEnabled || hasActiveDirectDispatchOrders ? (
                    <TouchableOpacity
                        onPress={onOpenDirectDispatch}
                        disabled={controlsDisabled}
                        activeOpacity={0.8}
                        style={{
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 4,
                            borderRadius: 14,
                            backgroundColor: '#818cf818',
                            borderWidth: 1,
                            borderColor: '#818cf83d',
                            opacity: controlsDisabled ? 0.6 : 1,
                            marginTop: 8,
                        }}
                    >
                        <View
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: '#818cf825',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 4,
                            }}
                        >
                            <Ionicons name="call" size={17} color="#a5b4fc" />
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#cbd5e1', textAlign: 'center' }}>
                            {t('orderAccept.direct_call', 'Direct Call')}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}
