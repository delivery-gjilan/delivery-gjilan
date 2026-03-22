import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AdminStatusBadge, AdminBottomSheet, AdminButton } from '@/components/admin/AdminComponents';
import {
    ADMIN_GET_ORDER,
    ADMIN_UPDATE_ORDER_STATUS,
    ADMIN_START_PREPARING,
    ADMIN_UPDATE_PREPARATION_TIME,
    ADMIN_CANCEL_ORDER,
    ADMIN_ASSIGN_DRIVER_TO_ORDER,
} from '@/graphql/operations/admin/orders';
import { ADMIN_GET_DRIVERS } from '@/graphql/operations/admin/drivers';
import { adminFormatCurrency, adminFormatTime, adminFormatDate } from '@/utils/adminHelpers';
import LoadingScreen from '@/components/LoadingScreen';

const PREP_TIMES = [10, 15, 20, 30, 45, 60];

export default function AdminOrderDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();

    const [showPrepModal, setShowPrepModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [selectedPrepTime, setSelectedPrepTime] = useState(20);

    const { data, loading, refetch }: any = useQuery(ADMIN_GET_ORDER, { variables: { id: orderId } });
    const { data: driversData }: any = useQuery(ADMIN_GET_DRIVERS);

    const [updateStatus, { loading: statusLoading }] = useMutation(ADMIN_UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: prepLoading }] = useMutation(ADMIN_START_PREPARING);
    const [cancelOrder, { loading: cancelLoading }] = useMutation(ADMIN_CANCEL_ORDER);
    const [assignDriver, { loading: assignLoading }] = useMutation(ADMIN_ASSIGN_DRIVER_TO_ORDER);
    const [updatePrepTime] = useMutation(ADMIN_UPDATE_PREPARATION_TIME);

    const order = data?.order;
    const drivers = driversData?.drivers || [];

    if (loading) return <LoadingScreen />;
    if (!order) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <Text className="text-center mt-10" style={{ color: theme.colors.subtext }}>Order not found</Text>
            </SafeAreaView>
        );
    }

    const handleStartPreparing = async () => {
        try {
            await startPreparing({ variables: { id: orderId, preparationMinutes: selectedPrepTime } });
            setShowPrepModal(false);
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            await updateStatus({ variables: { id: orderId, status } });
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err.message);
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
                    } catch (err: any) {
                        Alert.alert('Error', err.message);
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
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const onlineDrivers = drivers.filter(
        (d: any) => d.driverConnection?.connectionStatus === 'CONNECTED',
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mr-3">
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold flex-1" style={{ color: theme.colors.text }}>
                    Order Detail
                </Text>
                <AdminStatusBadge status={order.status} size="md" />
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Price Summary */}
                <View className="rounded-2xl p-4 mb-3 mt-3" style={{ backgroundColor: theme.colors.card }}>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>Order Price</Text>
                        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{adminFormatCurrency(order.orderPrice)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>Delivery Fee</Text>
                        <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>{adminFormatCurrency(order.deliveryPrice)}</Text>
                    </View>
                    <View className="h-px my-1" style={{ backgroundColor: theme.colors.border }} />
                    <View className="flex-row justify-between">
                        <Text className="text-base font-bold" style={{ color: theme.colors.text }}>Total</Text>
                        <Text className="text-base font-bold" style={{ color: theme.colors.primary }}>{adminFormatCurrency(order.totalPrice)}</Text>
                    </View>
                </View>

                {/* Prep time (if preparing) */}
                {order.status === 'PREPARING' && order.estimatedReadyAt && (
                    <View className="rounded-2xl p-4 mb-3 flex-row items-center" style={{ backgroundColor: '#6366f115' }}>
                        <Ionicons name="timer-outline" size={20} color="#6366f1" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold" style={{ color: '#6366f1' }}>
                                Prep Time: {order.preparationMinutes} min
                            </Text>
                            <Text className="text-xs" style={{ color: '#6366f1' }}>
                                Ready ~{adminFormatTime(order.estimatedReadyAt)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: '#6366f1' }}
                            onPress={() => setShowPrepModal(true)}>
                            <Text className="text-xs text-white font-semibold">Edit</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Customer */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-xs font-medium mb-2" style={{ color: theme.colors.subtext }}>Customer</Text>
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        {order.user?.firstName} {order.user?.lastName}
                    </Text>
                    {order.user?.phoneNumber && (
                        <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>{order.user.phoneNumber}</Text>
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
                            <Text className="text-xs font-medium mb-1" style={{ color: theme.colors.subtext }}>Driver</Text>
                            <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                {order.driver ? `${order.driver.firstName} ${order.driver.lastName}` : 'Unassigned'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: theme.colors.primary }}
                            onPress={() => setShowDriverModal(true)}>
                            <Text className="text-xs text-white font-semibold">
                                {order.driver ? 'Reassign' : 'Assign Driver'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Businesses & Items */}
                {order.businesses?.map((b: any, i: number) => (
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
                        {b.items?.map((item: any, j: number) => (
                            <View
                                key={j}
                                className="flex-row items-center justify-between py-1.5"
                                style={j > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : {}}>
                                <View className="flex-row items-center flex-1">
                                    <View className="w-6 h-6 rounded-md items-center justify-center mr-2" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                        <Text className="text-xs font-bold" style={{ color: theme.colors.primary }}>{item.quantity}</Text>
                                    </View>
                                    <Text className="text-sm flex-1" style={{ color: theme.colors.text }}>{item.name}</Text>
                                </View>
                                <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                    {adminFormatCurrency(item.price * item.quantity)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Timeline */}
                <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-xs font-medium mb-2" style={{ color: theme.colors.subtext }}>Timeline</Text>
                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                        Ordered: {adminFormatDate(order.orderDate)} {adminFormatTime(order.orderDate)}
                    </Text>
                    {order.preparingAt && (
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            Preparing: {adminFormatTime(order.preparingAt)}
                        </Text>
                    )}
                    {order.updatedAt && (
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            Last Updated: {adminFormatTime(order.updatedAt)}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="mb-8 gap-2">
                    {order.status === 'PENDING' && (
                        <AdminButton title="Start Preparing" onPress={() => setShowPrepModal(true)} size="lg" icon="restaurant-outline" />
                    )}
                    {order.status === 'PREPARING' && (
                        <AdminButton
                            title="Mark as Ready"
                            onPress={() => handleUpdateStatus('READY')}
                            loading={statusLoading}
                            size="lg"
                            style={{ backgroundColor: '#22c55e' }}
                        />
                    )}
                    {order.status === 'READY' && (
                        <AdminButton
                            title="Out for Delivery"
                            onPress={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
                            loading={statusLoading}
                            size="lg"
                            style={{ backgroundColor: '#3b82f6' }}
                        />
                    )}
                    {['PENDING', 'PREPARING', 'READY'].includes(order.status) && (
                        <AdminButton
                            title="Cancel Order"
                            onPress={handleCancel}
                            loading={cancelLoading}
                            variant="danger"
                            size="md"
                        />
                    )}
                </View>
            </ScrollView>

            {/* Prep Time Modal */}
            <AdminBottomSheet visible={showPrepModal} onClose={() => setShowPrepModal(false)} title="Set Preparation Time">
                <Text className="text-sm mb-4" style={{ color: theme.colors.subtext }}>
                    How long will it take to prepare this order?
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
                                minWidth: 70,
                            }}
                            onPress={() => setSelectedPrepTime(mins)}>
                            <Text className="text-lg font-bold" style={{ color: selectedPrepTime === mins ? '#fff' : theme.colors.text }}>
                                {mins}
                            </Text>
                            <Text className="text-xs" style={{ color: selectedPrepTime === mins ? 'rgba(255,255,255,0.8)' : theme.colors.subtext }}>
                                min
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <AdminButton
                    title={order.status === 'PREPARING' ? 'Save' : 'Start Preparing'}
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
            </AdminBottomSheet>

            {/* Assign Driver Modal */}
            <AdminBottomSheet visible={showDriverModal} onClose={() => setShowDriverModal(false)} title="Assign Driver">
                {onlineDrivers.length === 0 ? (
                    <Text className="text-sm py-6 text-center" style={{ color: theme.colors.subtext }}>
                        No drivers online
                    </Text>
                ) : (
                    onlineDrivers.map((driver: any) => (
                        <TouchableOpacity
                            key={driver.id}
                            className="flex-row items-center p-3 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => handleAssignDriver(driver.id)}
                            disabled={assignLoading}>
                            <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center mr-3">
                                <Text className="text-white font-bold text-sm">
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
            </AdminBottomSheet>
        </SafeAreaView>
    );
}
