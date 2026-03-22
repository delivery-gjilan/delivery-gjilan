import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#06b6d4',
    READY: '#3b82f6',
    OUT_FOR_DELIVERY: '#8b5cf6',
};
const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
};
const STATUS_ICONS: Record<string, string> = {
    PENDING: 'time-outline',
    PREPARING: 'restaurant-outline',
    READY: 'bag-check-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
};

interface Props {
    order: any;
    routeInfo: { distanceKm: number; durationMin: number } | null;
    previewRouteInfo: { distanceKm: number; durationMin: number } | null;
    isAssignedToMe: boolean;
    onStartNavigation: () => void;
    onClose: () => void;
}

export function OrderDetailSheet({
    order,
    routeInfo,
    previewRouteInfo,
    isAssignedToMe,
    onStartNavigation,
    onClose,
}: Props) {
    const translateY = useSharedValue(600);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withSpring(0, { damping: 22, stiffness: 210 });
        opacity.value = withTiming(1, { duration: 200 });
    }, [order?.id]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const handleStart = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onStartNavigation();
    }, [onStartNavigation]);

    const statusColor = STATUS_COLORS[order.status] ?? '#6b7280';
    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const statusIcon = STATUS_ICONS[order.status] ?? 'ellipse-outline';

    const bizName = order.businesses?.[0]?.business?.name ?? 'Business';
    const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : '';
    const dropAddress = order.dropOffLocation?.address ?? '';
    const items = order.businesses?.flatMap((b: any) => b.items ?? []) ?? [];
    const deliveryPrice = Number(order.deliveryPrice ?? 0).toFixed(2);
    const totalItems = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);

    const totalMinutes =
        routeInfo && previewRouteInfo
            ? Math.round(routeInfo.durationMin + previewRouteInfo.durationMin)
            : routeInfo
            ? Math.round(routeInfo.durationMin)
            : null;

    const isDelivering = order.status === 'OUT_FOR_DELIVERY';

    return (
        <Animated.View
            style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }, animStyle]}
        >
            <View
                style={{
                    backgroundColor: '#0f172a',
                    borderTopLeftRadius: 26,
                    borderTopRightRadius: 26,
                    paddingBottom: 36,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -5 },
                    shadowOpacity: 0.5,
                    shadowRadius: 18,
                    elevation: 22,
                }}
            >
                {/* Drag handle / close zone */}
                <Pressable
                    onPress={onClose}
                    style={{ paddingVertical: 12, alignItems: 'center' }}
                    hitSlop={12}
                >
                    <View
                        style={{
                            width: 36,
                            height: 4,
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            borderRadius: 2,
                        }}
                    />
                </Pressable>

                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 4 }}
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: 14,
                        }}
                    >
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text
                                style={{ color: '#f1f5f9', fontSize: 19, fontWeight: '800' }}
                                numberOfLines={1}
                            >
                                {bizName}
                            </Text>
                            {customerName ? (
                                <Text style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                                    <Ionicons name="person-outline" size={11} color="#64748b" />{' '}
                                    {customerName}
                                </Text>
                            ) : null}
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                backgroundColor: `${statusColor}1A`,
                                borderRadius: 20,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                marginTop: 2,
                                borderWidth: 1,
                                borderColor: `${statusColor}30`,
                            }}
                        >
                            <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>
                                {statusLabel}
                            </Text>
                        </View>
                    </View>

                    {/* Route tiles */}
                    {(routeInfo || totalMinutes) && (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                            {routeInfo && (
                                <View
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 7,
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        borderRadius: 12,
                                        padding: 10,
                                    }}
                                >
                                    <Ionicons name="navigate-outline" size={14} color="#94a3b8" />
                                    <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '700' }}>
                                        {routeInfo.distanceKm.toFixed(1)} km
                                    </Text>
                                    <Text style={{ color: '#64748b', fontSize: 11 }}>to pickup</Text>
                                </View>
                            )}
                            {totalMinutes != null && (
                                <View
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 7,
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        borderRadius: 12,
                                        padding: 10,
                                    }}
                                >
                                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                                    <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '700' }}>
                                        ~{totalMinutes} min
                                    </Text>
                                    <Text style={{ color: '#64748b', fontSize: 11 }}>total</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Drop-off address */}
                    {dropAddress ? (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: 10,
                                marginBottom: 14,
                            }}
                        >
                            <View
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: '#7c3aed1A',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 1,
                                    borderWidth: 1,
                                    borderColor: '#7c3aed30',
                                }}
                            >
                                <Ionicons name="location-outline" size={13} color="#a78bfa" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: '#64748b',
                                        fontSize: 9,
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.8,
                                        marginBottom: 2,
                                    }}
                                >
                                    Drop-off
                                </Text>
                                <Text
                                    style={{ color: '#f1f5f9', fontSize: 13, lineHeight: 19 }}
                                    numberOfLines={2}
                                >
                                    {dropAddress}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Items */}
                    {items.length > 0 && (
                        <View
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderRadius: 14,
                                padding: 12,
                                marginBottom: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: '#64748b',
                                    fontSize: 9,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.8,
                                    marginBottom: 8,
                                }}
                            >
                                Order Contents
                            </Text>
                            {items.slice(0, 5).map((item: any, idx: number) => (
                                <View
                                    key={idx}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: idx < Math.min(items.length, 5) - 1 ? 6 : 0,
                                    }}
                                >
                                    <Text
                                        style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        style={{
                                            color: '#475569',
                                            fontSize: 13,
                                            fontWeight: '600',
                                            marginLeft: 8,
                                        }}
                                    >
                                        ×{item.quantity}
                                    </Text>
                                </View>
                            ))}
                            {items.length > 5 && (
                                <Text
                                    style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}
                                >
                                    +{items.length - 5} more items
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Financials row */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: 16,
                            paddingHorizontal: 2,
                        }}
                    >
                        <View style={{ alignItems: 'center' }}>
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
                                Delivery Fee
                            </Text>
                            <Text style={{ color: '#4ade80', fontSize: 15, fontWeight: '800' }}>
                                €{deliveryPrice}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
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
                                Items
                            </Text>
                            <Text style={{ color: '#f1f5f9', fontSize: 15, fontWeight: '800' }}>
                                {totalItems}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
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
                                Order #{order.displayId ?? '—'}
                            </Text>
                            <Text style={{ color: '#f1f5f9', fontSize: 15, fontWeight: '800' }}>
                                #{order.displayId ?? '—'}
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* CTA */}
                {isAssignedToMe && (
                    <View style={{ paddingHorizontal: 18 }}>
                        <Pressable
                            onPress={handleStart}
                            style={{
                                height: 58,
                                borderRadius: 18,
                                backgroundColor: isDelivering ? '#7c3aed' : '#3b82f6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 8,
                                shadowColor: isDelivering ? '#7c3aed' : '#3b82f6',
                                shadowOffset: { width: 0, height: 5 },
                                shadowOpacity: 0.38,
                                shadowRadius: 12,
                                elevation: 10,
                            }}
                        >
                            <Ionicons
                                name={isDelivering ? 'navigate' : 'bicycle-outline'}
                                size={20}
                                color="#fff"
                            />
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                {isDelivering ? 'Continue Navigation' : 'Start Navigation'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}
