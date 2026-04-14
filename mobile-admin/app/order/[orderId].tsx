import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import LoadingScreen from '@/components/LoadingScreen';
import {
    GET_ORDER,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    UPDATE_PREPARATION_TIME,
    CANCEL_ORDER,
    ASSIGN_DRIVER_TO_ORDER,
    APPROVE_ORDER,
} from '@/graphql/orders';
import { GET_DRIVERS } from '@/graphql/drivers';
import { formatCurrency, formatTime, formatDate } from '@/utils/helpers';

const PREP_TIMES = [10, 15, 20, 30, 45, 60];

export default function OrderDetailScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();

    const [showPrepModal, setShowPrepModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [selectedPrepTime, setSelectedPrepTime] = useState(20);

    const { data, loading, refetch } = useQuery(GET_ORDER, { variables: { id: orderId } });
    const { data: driversData } = useQuery(GET_DRIVERS);

    const [updateStatus, { loading: statusLoading }] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: prepLoading }] = useMutation(START_PREPARING);
    const [cancelOrder, { loading: cancelLoading }] = useMutation(CANCEL_ORDER);
    const [assignDriver, { loading: assignLoading }] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [updatePrepTime] = useMutation(UPDATE_PREPARATION_TIME);
    const [approveOrder, { loading: approveLoading }] = useMutation(APPROVE_ORDER);

    const order = data?.order;
    const drivers = driversData?.drivers || [];

    if (loading) return <LoadingScreen />;
    if (!order) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <Text className="text-center mt-10" style={{ color: theme.colors.subtext }}>
                    Order not found
                </Text>
            </SafeAreaView>
        );
    }

    const handleStartPreparing = async () => {
        try {
            await startPreparing({
                variables: { id: orderId, preparationMinutes: selectedPrepTime },
            });
            setShowPrepModal(false);
            refetch();
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error).message);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            await updateStatus({ variables: { id: orderId, status } });
            refetch();
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error).message);
        }
    };

    const handleCancel = () => {
        Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelOrder({ variables: { id: orderId } });
                        refetch();
                    } catch (err: unknown) {
                        Alert.alert('Error', (err as Error).message);
                    }
                },
            },
        ]);
    };

    const handleAssignDriver = async (driverId: string) => {
        try {
            await assignDriver({ variables: { id: orderId, driverId } });
            setShowDriverModal(false);
            refetch();
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error).message);
        }
    };

    const onlineDrivers = drivers.filter(
        (d) => d.driverConnection?.connectionStatus === 'CONNECTED',
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3">
                <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold ml-3 flex-1" style={{ color: theme.colors.text }}>
                    {t.orders.detail.title}
                </Text>
                <StatusBadge status={order.status} label={t.orders.status[order.status as keyof typeof t.orders.status]} size="md" />
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* Price Summary */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.orders.detail.orderPrice}</Text>
                        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{formatCurrency(order.orderPrice)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.orders.detail.deliveryFee}</Text>
                        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{formatCurrency(order.deliveryPrice)}</Text>
                    </View>
                    <View className="h-px my-1" style={{ backgroundColor: theme.colors.border }} />
                    <View className="flex-row justify-between">
                        <Text className="text-base font-bold" style={{ color: theme.colors.text }}>{t.orders.detail.total}</Text>
                        <Text className="text-base font-bold" style={{ color: theme.colors.primary }}>{formatCurrency(order.totalPrice)}</Text>
                    </View>
                </View>

                {/* Prep Time (if preparing) */}
                {order.status === 'PREPARING' && order.estimatedReadyAt && (
                    <View className="rounded-2xl p-4 mb-3 flex-row items-center" style={{ backgroundColor: '#6366f115' }}>
                        <Ionicons name="timer-outline" size={20} color="#6366f1" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold" style={{ color: '#6366f1' }}>
                                {t.orders.detail.prepTime}: {order.preparationMinutes} min
                            </Text>
                            <Text className="text-xs" style={{ color: '#6366f1' }}>
                                {t.orders.detail.estimatedReady}: {formatTime(order.estimatedReadyAt)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: '#6366f1' }}
                            onPress={() => setShowPrepModal(true)}>
                            <Text className="text-xs text-white font-semibold">{t.common.edit}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Customer */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-xs font-medium mb-2" style={{ color: theme.colors.subtext }}>
                        {t.orders.detail.customer}
                    </Text>
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        {order.user?.firstName} {order.user?.lastName}
                    </Text>
                    {order.user?.phoneNumber && (
                        <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                            {order.user.phoneNumber}
                        </Text>
                    )}
                    {order.dropOffLocation?.address && (
                        <View className="flex-row items-start mt-2">
                            <Ionicons name="location" size={14} color={theme.colors.primary} />
                            <Text className="text-xs ml-1 flex-1" style={{ color: theme.colors.subtext }}>
                                {order.dropOffLocation.address}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Driver */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-xs font-medium mb-1" style={{ color: theme.colors.subtext }}>
                                {t.orders.detail.driver}
                            </Text>
                            <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                {order.driver
                                    ? `${order.driver.firstName} ${order.driver.lastName}`
                                    : t.orders.detail.unassigned}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: theme.colors.primary }}
                            onPress={() => setShowDriverModal(true)}>
                            <Text className="text-xs text-white font-semibold">
                                {order.driver ? 'Reassign' : t.orders.detail.assignDriver}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Businesses & Items */}
                {order.businesses?.map((b, i: number) => (
                    <View key={i} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                        <View className="flex-row items-center mb-2">
                            <Ionicons
                                name={b.business?.businessType === 'RESTAURANT' ? 'restaurant' : 'storefront'}
                                size={16}
                                color={theme.colors.primary}
                            />
                            <Text className="text-sm font-semibold ml-2" style={{ color: theme.colors.text }}>
                                {b.business?.name}
                            </Text>
                        </View>
                        {b.items?.map((item, j: number) => (
                            <View key={j} className="flex-row items-center justify-between py-1.5" style={j > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : {}}>
                                <View className="flex-row items-center flex-1">
                                    <View className="w-6 h-6 rounded-md items-center justify-center mr-2" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                        <Text className="text-xs font-bold" style={{ color: theme.colors.primary }}>{item.quantity}</Text>
                                    </View>
                                    <Text className="text-sm flex-1" style={{ color: theme.colors.text }}>{item.name}</Text>
                                </View>
                                <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                    {formatCurrency((item.unitPrice ?? item.price ?? 0) * item.quantity)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Timeline */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-xs font-medium mb-2" style={{ color: theme.colors.subtext }}>Timeline</Text>
                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                        Ordered: {formatDate(order.orderDate)} {formatTime(order.orderDate)}
                    </Text>
                    {order.preparingAt && (
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            Preparing: {formatTime(order.preparingAt)}
                        </Text>
                    )}
                    {order.updatedAt && (
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            Last Updated: {formatTime(order.updatedAt)}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="mb-8">
                    {order.status === 'AWAITING_APPROVAL' && (
                        <Button
                            title="Approve Order"
                            onPress={async () => {
                                try {
                                    await approveOrder({ variables: { id: orderId } });
                                    refetch();
                                } catch (err: unknown) {
                                    Alert.alert('Error', (err as Error).message);
                                }
                            }}
                            loading={approveLoading}
                            size="lg"
                            style={{ backgroundColor: '#f97316' }}
                        />
                    )}
                    {order.status === 'PENDING' && (
                        <Button
                            title={t.orders.detail.startPreparing}
                            onPress={() => setShowPrepModal(true)}
                            size="lg"
                        />
                    )}
                    {order.status === 'PREPARING' && (
                        <Button
                            title={t.orders.detail.markReady}
                            onPress={() => handleUpdateStatus('READY')}
                            loading={statusLoading}
                            size="lg"
                            style={{ backgroundColor: '#22c55e' }}
                        />
                    )}
                    {['PENDING', 'PREPARING', 'READY'].includes(order.status) && (
                        <Button
                            title={t.orders.detail.cancel}
                            onPress={handleCancel}
                            loading={cancelLoading}
                            variant="danger"
                            size="md"
                            style={{ marginTop: 8 }}
                        />
                    )}
                </View>
            </ScrollView>

            {/* Prep Time Modal */}
            <BottomSheet
                visible={showPrepModal}
                onClose={() => setShowPrepModal(false)}
                title={t.orders.prepModal.title}>
                <Text className="text-sm mb-4" style={{ color: theme.colors.subtext }}>
                    {t.orders.prepModal.subtitle}
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                    {PREP_TIMES.map((mins) => (
                        <TouchableOpacity
                            key={mins}
                            className="rounded-xl px-5 py-3 items-center"
                            style={{
                                backgroundColor: selectedPrepTime === mins ? theme.colors.primary : theme.colors.card,
                                borderWidth: 1,
                                borderColor: selectedPrepTime === mins ? theme.colors.primary : theme.colors.border,
                            }}
                            onPress={() => setSelectedPrepTime(mins)}>
                            <Text
                                className="text-lg font-bold"
                                style={{ color: selectedPrepTime === mins ? '#fff' : theme.colors.text }}>
                                {mins}
                            </Text>
                            <Text
                                className="text-xs"
                                style={{ color: selectedPrepTime === mins ? 'rgba(255,255,255,0.8)' : theme.colors.subtext }}>
                                {t.orders.prepModal.minutes}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Button
                    title={order.status === 'PREPARING' ? t.common.save : t.orders.prepModal.start}
                    onPress={async () => {
                        if (order.status === 'PREPARING') {
                            await updatePrepTime({ variables: { id: orderId, preparationMinutes: selectedPrepTime } });
                            setShowPrepModal(false);
                            refetch();
                        } else {
                            handleStartPreparing();
                        }
                    }}
                    loading={prepLoading}
                    size="lg"
                />
            </BottomSheet>

            {/* Assign Driver Modal */}
            <BottomSheet
                visible={showDriverModal}
                onClose={() => setShowDriverModal(false)}
                title={t.orders.detail.assignDriver}>
                {onlineDrivers.length === 0 ? (
                    <Text className="text-sm py-6 text-center" style={{ color: theme.colors.subtext }}>
                        No drivers online
                    </Text>
                ) : (
                    onlineDrivers.map((driver) => (
                        <TouchableOpacity
                            key={driver.id}
                            className="flex-row items-center p-3 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => handleAssignDriver(driver.id)}>
                            <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center mr-3">
                                <Text className="text-white font-bold">
                                    {driver.firstName?.[0]}{driver.lastName?.[0]}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {driver.firstName} {driver.lastName}
                                </Text>
                                <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                    {driver.phoneNumber || driver.email}
                                </Text>
                            </View>
                            {order.driver?.id === driver.id && (
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </BottomSheet>
        </SafeAreaView>
    );
}
