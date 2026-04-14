import React from 'react';
import {
    View,
    Text,
    Pressable,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    Order,
    OrderStatus,
    STATUS_COLORS,
    STATUS_BG,
    STATUS_CARD_BG,
    STATUS_ICONS,
} from './types';
import { timeAgo, getElapsedTime, getTimeRemaining } from './helpers';

interface OrderCardProps {
    order: Order;
    businessId: string;
    isTablet: boolean;
    isMarket: boolean;
    tick: number;
    isSelected: boolean;
    isExpanded: boolean;
    onPress: () => void;
    onDoubleTap: () => void;
    onAccept: () => void;
    onMarkReady: () => void;
    onReject: () => void;
    onAddTime: () => void;
    onRemoveItem: (data: { orderId: string; itemId: string; itemName: string; itemQuantity: number }) => void;
    onToggleExpand: () => void;
}

export function OrderCard({
    order,
    businessId,
    isTablet,
    isMarket,
    tick,
    isSelected,
    isExpanded,
    onPress,
    onDoubleTap,
    onAccept,
    onMarkReady,
    onReject,
    onAddTime,
    onRemoveItem,
    onToggleExpand,
}: OrderCardProps) {
    const { t } = useTranslation();

    const businessOrder = order.businesses.find((b) => b.business.id === businessId);
    if (!businessOrder) return null;

    const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const isPending = order.status === 'PENDING';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const showHeaderTimer = isPending || isReady;
    const canAct = isPending || isPreparing;
    const pendingBlinkOn = isPending && tick % 2 === 0;

    const maxCollapsedItems = 5;
    const shouldCollapseItems = businessOrder.items.length > maxCollapsedItems;
    const visibleItems = shouldCollapseItems && !isExpanded
        ? businessOrder.items.slice(0, maxCollapsedItems)
        : businessOrder.items;
    const hiddenItemsCount = businessOrder.items.length - visibleItems.length;

    const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`.trim()
        : t('orders.customer', 'Customer');
    const customerPhone = order.user?.phoneNumber?.trim();

    const elapsedText =
        (order.status === 'PENDING' && getElapsedTime(order.orderDate)) ||
        (order.status === 'PREPARING' && order.preparingAt && getElapsedTime(order.preparingAt)) ||
        (order.status === 'READY' && order.readyAt && getElapsedTime(order.readyAt)) ||
        (order.status === 'OUT_FOR_DELIVERY' && order.readyAt && getElapsedTime(order.readyAt)) ||
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
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
        >
            <View
                className="bg-card rounded-2xl mb-3 overflow-hidden"
                style={{
                    marginHorizontal: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: pendingBlinkOn ? '#ef4444' : STATUS_COLORS[order.status],
                    borderWidth: 1,
                    borderColor: isSelected
                        ? STATUS_COLORS[order.status]
                        : pendingBlinkOn
                        ? 'rgba(239,68,68,0.95)'
                        : `${STATUS_COLORS[order.status]}55`,
                    backgroundColor: pendingBlinkOn ? 'rgba(239,68,68,0.18)' : STATUS_CARD_BG[order.status],
                    shadowColor: isSelected ? STATUS_COLORS[order.status] : 'transparent',
                    shadowOpacity: isSelected ? 0.4 : 0,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 0,
                }}
            >
                {/* ── Header ── */}
                <View className="px-3 pt-3 pb-2">
                    <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                            <View
                                className="w-9 h-9 rounded-xl items-center justify-center mr-2"
                                style={{ backgroundColor: STATUS_BG[order.status] }}
                            >
                                <Ionicons
                                    name={STATUS_ICONS[order.status] as any}
                                    size={18}
                                    color={STATUS_COLORS[order.status]}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text font-bold text-base">#{order.displayId}</Text>
                                <Text className="text-subtext text-xs">{timeAgo(order.orderDate)}</Text>
                            </View>
                        </View>

                        {showHeaderTimer && (
                            <View className="mx-2 mt-0.5 px-2.5 py-1 rounded-full bg-white/15">
                                <View className="flex-row items-center">
                                    <Ionicons name="time-outline" size={isTablet ? 13 : 12} color="#fff" />
                                    <Text className={`text-white font-bold ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                                        {elapsedText}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View className="items-end">
                            <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: STATUS_BG[order.status] }}
                            >
                                <Text className="font-bold text-xs" style={{ color: STATUS_COLORS[order.status] }}>
                                    {statusLabels[order.status]}
                                </Text>
                            </View>
                            {isPreparing && (
                                <Text className="text-subtext text-[10px] mt-1">
                                    {t('orders.tap_twice_mark_ready', 'Tap twice to mark ready')}
                                </Text>
                            )}
                            {order.driver && (
                                <Text className="text-white/85 text-[10px] mt-1 font-bold" numberOfLines={1}>
                                    {order.driver.firstName} {order.driver.lastName}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Elapsed time counter */}
                    {!showHeaderTimer && (
                        <View
                            className="flex-row items-center rounded-xl px-3 py-2.5 mt-2"
                            style={{ backgroundColor: STATUS_BG[order.status] }}
                        >
                            <Ionicons name="time-outline" size={isTablet ? 18 : 17} color="#fff" />
                            <Text className={`font-extrabold ml-2 ${isTablet ? 'text-xl' : 'text-lg'}`} style={{ color: '#fff' }}>
                                {elapsedText}
                            </Text>
                            <Text className={`text-white/80 ml-1 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                                {t('orders.elapsed', 'elapsed')}
                            </Text>

                            {isPreparing && timeRemaining && (
                                <View className="ml-auto flex-row items-center">
                                    <View className="w-px h-5 bg-white/35 mr-2" />
                                    <Ionicons
                                        name={timeRemaining.isOverdue ? 'warning' : 'timer-outline'}
                                        size={isTablet ? 16 : 15}
                                        color="#fff"
                                    />
                                    <Text className={`font-bold ml-1 ${isTablet ? 'text-base' : 'text-sm'}`} style={{ color: '#fff' }}>
                                        {timeRemaining.text}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* ── Customer ── */}
                <View className="px-3 pb-2">
                    <View className="rounded-xl px-2.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <View className="flex-row items-center">
                            <Ionicons name="person-outline" size={14} color="#cbd5e1" />
                            <Text className={`text-text font-semibold ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`} numberOfLines={1}>
                                {customerName}
                            </Text>
                        </View>
                        {customerPhone ? (
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="call-outline" size={12} color="#94a3b8" />
                                <Text className={`text-subtext ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`} numberOfLines={1}>
                                    {customerPhone}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* ── Items ── */}
                <View className="px-3 pb-2">
                    {visibleItems.map((item, index) => (
                        <View key={index} className="py-2">
                            <View className="flex-row items-start">
                                <View
                                    className="rounded-full items-center justify-center self-start mt-0.5 mr-2.5 px-2.5 py-1.5"
                                    style={{ backgroundColor: STATUS_COLORS[order.status], borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' }}
                                >
                                    <Text className={`text-white font-extrabold leading-none ${isTablet ? 'text-2xl' : 'text-xl'}`}>
                                        {item.quantity}×
                                    </Text>
                                </View>

                                {isMarket && item.imageUrl ? (
                                    <Image
                                        source={{ uri: item.imageUrl }}
                                        style={{ width: isTablet ? 52 : 44, height: isTablet ? 52 : 44, borderRadius: 10, marginRight: 10, backgroundColor: '#1e293b' }}
                                        resizeMode="cover"
                                    />
                                ) : null}

                                <View className="flex-1">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1 pr-2">
                                            <Text className={`text-text font-semibold ${isTablet ? 'text-base' : 'text-sm'}`} numberOfLines={2}>
                                                {item.name}
                                            </Text>
                                        </View>
                                        <Text className={`text-text font-bold ml-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
                                            €{(item.unitPrice * item.quantity).toFixed(2)}
                                        </Text>
                                        {canAct && (
                                            <TouchableOpacity
                                                hitSlop={8}
                                                onPress={() => onRemoveItem({ orderId: order.id, itemId: item.id, itemName: item.name, itemQuantity: item.quantity })}
                                                style={{ marginLeft: 10, padding: 4 }}
                                            >
                                                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {item.notes && (
                                        <View className="mt-2 bg-warning/10 rounded-lg px-2.5 py-2">
                                            <Text className={`text-warning mt-0.5 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                                                {item.notes}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {index < visibleItems.length - 1 && (
                                <View className="mt-2 h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
                            )}
                        </View>
                    ))}

                    {shouldCollapseItems && (
                        <TouchableOpacity
                            className="mt-1 mb-1 self-start flex-row items-center"
                            onPress={onToggleExpand}
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-sm">
                                {isExpanded
                                    ? t('orders.show_less_items', 'Show less')
                                    : t('orders.show_all_items', 'Show all')}{hiddenItemsCount > 0 ? ` (${hiddenItemsCount} ${t('orders.more_items', 'more')})` : ''}
                            </Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Total ── */}
                <View className="mx-3 pt-2 pb-2.5 border-t border-gray-700 flex-row items-center justify-between">
                    <Text className={`text-subtext font-semibold ${isTablet ? 'text-base' : 'text-sm'}`}>
                        {t('orders.total', 'Total')}
                    </Text>
                    <Text className={`text-success font-extrabold ${isTablet ? 'text-3xl' : 'text-2xl'}`}>
                        €{businessSubtotal.toFixed(2)}
                    </Text>
                </View>

                {/* ── Actions (on phone) — tablet shows these in the detail panel ── */}
                {!isTablet && isPending && (
                    <View className="flex-row border-t border-gray-700">
                        <TouchableOpacity
                            className="flex-1 py-3 flex-row items-center justify-center border-r border-gray-700"
                            style={{ backgroundColor: '#ef444415' }}
                            onPress={onReject}
                        >
                            <Ionicons name="close" size={18} color="#ef4444" />
                            <Text className="text-danger font-bold text-sm ml-1.5">{t('orders.reject', 'Reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-[2] py-3 flex-row items-center justify-center"
                            style={{ backgroundColor: '#10b98115' }}
                            onPress={onAccept}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                            <Text className="text-success font-bold text-sm ml-1.5">{t('orders.accept', 'Accept')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isTablet && isPreparing && (
                    <View className="flex-row border-t border-gray-700">
                        <TouchableOpacity
                            className="py-3 flex-row items-center justify-center border-r border-gray-700"
                            style={{ flex: 1, backgroundColor: '#f59e0b15' }}
                            onPress={onAddTime}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#f59e0b" />
                            <Text className="font-bold text-sm ml-1.5" style={{ color: '#f59e0b' }}>
                                {t('orders.add_time', 'Add Time')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="py-3 flex-row items-center justify-center"
                            style={{ flex: 2, backgroundColor: '#10b98115' }}
                            onPress={onMarkReady}
                        >
                            <Ionicons name="checkmark-done-circle" size={18} color="#10b981" />
                            <Text className="text-success font-bold text-sm ml-1.5">
                                {t('orders.mark_ready', 'Mark Ready')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Pressable>
    );
}
