import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    Pressable,
    Image,
    Animated,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Order, OrderStatus, STATUS_COLORS, STATUS_BG, STATUS_CARD_BG, STATUS_ICONS } from './types';
import { timeAgo, getElapsedTime, getTimeRemaining } from './helpers';

interface OrderDetailPanelProps {
    order: Order | null;
    businessId: string;
    isTablet: boolean;
    isMarket: boolean;
    tick: number;
    onClose: () => void;
    onAccept: (orderId: string) => void;
    onMarkReady: (orderId: string) => void;
    onReject: (orderId: string) => void;
    onAddTime: (order: Order) => void;
    onRemoveItem: (data: { orderId: string; itemId: string; itemName: string; itemQuantity: number }) => void;
}

function PanelContent({
    order,
    businessId,
    isTablet,
    isMarket,
    tick,
    onClose,
    onAccept,
    onMarkReady,
    onReject,
    onAddTime,
    onRemoveItem,
}: OrderDetailPanelProps) {
    const { t } = useTranslation();

    if (!order) return null;

    const businessOrder = order.businesses.find((b) => b.business.id === businessId);
    if (!businessOrder) {
        return (
            <View style={{ flex: 1, backgroundColor: '#09090b' }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.07)',
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#f1f5f9', fontWeight: '800', fontSize: 17 }}>
                            #{order.displayId}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>
                            {t('orders.details_unavailable', 'Order details temporarily unavailable')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={8}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="close" size={16} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                    <View
                        style={{
                            borderRadius: 14,
                            padding: 14,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.08)',
                        }}
                    >
                        <Text style={{ color: '#f1f5f9', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
                            {t('orders.details_not_ready_title', 'Details are syncing')}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 19 }}>
                            {t('orders.details_not_ready_message', 'Please close and reopen this order card in a moment.')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const isPending = order.status === 'PENDING';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const canAct = isPending || isPreparing;

    const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : t('orders.customer', 'Customer');
    const customerPhone = order.user?.phoneNumber?.trim();

    const elapsedText =
        (order.status === 'PENDING' && getElapsedTime(order.orderDate)) ||
        (order.status === 'PREPARING' && order.preparingAt && getElapsedTime(order.preparingAt)) ||
        (order.status === 'READY' && order.readyAt && getElapsedTime(order.readyAt)) ||
        '--:--';

    let timeRemaining: { text: string; isOverdue: boolean } | null = null;
    if (isPreparing && order.estimatedReadyAt) {
        timeRemaining = getTimeRemaining(order.estimatedReadyAt);
    }

    const statusLabels: Record<OrderStatus, string> = {
        PENDING: t('orders.new_order', 'New Order'),
        PREPARING: isMarket ? t('orders.packing', 'Packing') : t('orders.preparing', 'Preparing'),
        READY: t('orders.ready_pickup', 'Ready for Pickup'),
        OUT_FOR_DELIVERY: t('orders.out_for_delivery', 'Out for Delivery'),
        DELIVERED: t('orders.delivered', 'Delivered'),
        CANCELLED: t('orders.cancelled', 'Cancelled'),
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#09090b' }}>
            {/* Panel header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.07)',
                }}
            >
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: STATUS_BG[order.status],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                    }}
                >
                    <Ionicons name={STATUS_ICONS[order.status] as any} size={18} color={STATUS_COLORS[order.status]} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f1f5f9', fontWeight: '800', fontSize: 17 }}>
                        #{order.displayId}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{timeAgo(order.orderDate)}</Text>
                </View>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: STATUS_BG[order.status],
                        marginRight: 8,
                    }}
                >
                    <Text style={{ color: STATUS_COLORS[order.status], fontWeight: '700', fontSize: 12 }}>
                        {statusLabels[order.status]}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    hitSlop={8}
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Elapsed / time remaining */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: STATUS_BG[order.status],
                        marginBottom: 12,
                    }}
                >
                    <Ionicons name="time-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginLeft: 8 }}>
                        {elapsedText}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginLeft: 4 }}>
                        {t('orders.elapsed', 'elapsed')}
                    </Text>
                    {isPreparing && timeRemaining && (
                        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.3)', marginRight: 10 }} />
                            <Ionicons
                                name={timeRemaining.isOverdue ? 'warning' : 'timer-outline'}
                                size={15}
                                color="#fff"
                            />
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 }}>
                                {timeRemaining.text}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Customer */}
                <View
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: customerPhone ? 6 : 0 }}>
                        <Ionicons name="person-outline" size={15} color="#94a3b8" />
                        <Text style={{ color: '#f1f5f9', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
                            {customerName}
                        </Text>
                    </View>
                    {customerPhone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="call-outline" size={14} color="#64748b" />
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>{customerPhone}</Text>
                        </View>
                    ) : null}
                    {order.driver && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <Ionicons name="bicycle-outline" size={14} color="#64748b" />
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>
                                {order.driver.firstName} {order.driver.lastName}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Items */}
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                    {t('orders.items', 'Items')} ({businessOrder.items.length})
                </Text>
                {businessOrder.items.map((item, index) => (
                    <View
                        key={index}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.06)',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            {isMarket && item.imageUrl ? (
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10, backgroundColor: '#1e293b' }}
                                    resizeMode="cover"
                                />
                            ) : null}
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#f1f5f9', fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 }} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 13 }}>
                                            {item.quantity}×
                                        </Text>
                                        <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 14 }}>
                                            €{(item.unitPrice * item.quantity).toFixed(2)}
                                        </Text>
                                        {canAct && (
                                            <TouchableOpacity
                                                hitSlop={8}
                                                onPress={() => onRemoveItem({ orderId: order.id, itemId: item.id, itemName: item.name, itemQuantity: item.quantity })}
                                                style={{ padding: 4 }}
                                            >
                                                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                {item.notes && (
                                    <View style={{ marginTop: 6, backgroundColor: '#f59e0b18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#f59e0b33' }}>
                                        <Text style={{ color: '#fcd34d', fontSize: 12 }}>{item.notes}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ))}

                {/* Total */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14 }}>
                        {t('orders.total', 'Total')}
                    </Text>
                    <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 26 }}>
                        €{businessSubtotal.toFixed(2)}
                    </Text>
                </View>

                {/* Action buttons */}
                {isPending && (
                    <View style={{ gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => onAccept(order.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 15,
                                borderRadius: 16,
                                backgroundColor: '#10b98120',
                                borderWidth: 1,
                                borderColor: '#10b98155',
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                                {t('orders.accept', 'Accept')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onReject(order.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRadius: 16,
                                backgroundColor: '#ef444415',
                                borderWidth: 1,
                                borderColor: '#ef444440',
                            }}
                        >
                            <Ionicons name="close-circle-outline" size={19} color="#ef4444" />
                            <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                                {t('orders.reject', 'Reject')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isPreparing && (
                    <View style={{ gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => onMarkReady(order.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 15,
                                borderRadius: 16,
                                backgroundColor: '#10b98120',
                                borderWidth: 1,
                                borderColor: '#10b98155',
                            }}
                        >
                            <Ionicons name="checkmark-done-circle" size={20} color="#10b981" />
                            <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                                {t('orders.mark_ready', 'Mark Ready')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onAddTime(order)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 14,
                                borderRadius: 16,
                                backgroundColor: '#f59e0b15',
                                borderWidth: 1,
                                borderColor: '#f59e0b40',
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={19} color="#f59e0b" />
                            <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                                {t('orders.add_time', 'Add Time')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

/**
 * On tablet: renders inline as a persistent side panel.
 * On phone: renders as a bottom-sheet Modal.
 */
export function OrderDetailPanel(props: OrderDetailPanelProps) {
    const { isTablet, order, onClose } = props;

    if (isTablet) {
        if (!order) return null;
        return (
            <View
                style={{
                    width: 360,
                    borderLeftWidth: 1,
                    borderLeftColor: 'rgba(255,255,255,0.07)',
                }}
            >
                <PanelContent {...props} />
            </View>
        );
    }

    // Phone: bottom-sheet modal with animated backdrop
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(backdropOpacity, {
            toValue: order ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [!!order]);

    return (
        <Modal
            visible={!!order}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                style={{ flex: 1, justifyContent: 'flex-end' }}
                onPress={onClose}
            >
                <Animated.View
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        opacity: backdropOpacity,
                    }}
                    pointerEvents="none"
                />

                <Pressable
                    style={{
                        backgroundColor: '#09090b',
                        maxHeight: '88%',
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Handle bar */}
                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2, backgroundColor: '#09090b' }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    </View>
                    <PanelContent {...props} />
                </Pressable>
            </Pressable>
        </Modal>
    );
}
