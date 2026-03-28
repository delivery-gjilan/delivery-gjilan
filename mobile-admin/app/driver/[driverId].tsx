import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { GET_DRIVERS, ADMIN_UPDATE_DRIVER_SETTINGS, UPDATE_DRIVER_ONLINE_STATUS } from '@/graphql/drivers';
import { getInitials, formatRelativeTime, formatCurrency } from '@/utils/helpers';

export default function DriverDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { driverId } = useLocalSearchParams<{ driverId: string }>();

    const { data }: any = useQuery(GET_DRIVERS);
    const [updateOnlineStatus] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);

    const driver = data?.drivers?.find((d: any) => d.id === driverId);

    if (!driver) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
                <Text style={{ color: theme.colors.subtext }}>Driver not found</Text>
            </SafeAreaView>
        );
    }

    const isOnline = driver.driverConnection?.connectionStatus === 'CONNECTED';
    const activeOrders = driver.activeOrders || [];

    const handleCallDriver = () => {
        if (driver.phone) Linking.openURL(`tel:${driver.phone}`);
    };

    const handleToggleOnline = async () => {
        try {
            await updateOnlineStatus({
                variables: { driverId: driver.id, isOnline: !isOnline },
            });
        } catch {
            Alert.alert('Error', 'Failed to update driver status');
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-lg font-bold flex-1" style={{ color: theme.colors.text }}>
                    Driver Details
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Profile */}
                <View className="items-center pt-6 pb-4">
                    <View
                        className="w-20 h-20 rounded-3xl items-center justify-center mb-3"
                        style={{ backgroundColor: `${isOnline ? '#22c55e' : theme.colors.border}20` }}>
                        <Text className="text-2xl font-bold" style={{ color: isOnline ? '#22c55e' : theme.colors.subtext }}>
                            {getInitials(`${driver.firstName} ${driver.lastName}`)}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        {driver.firstName} {driver.lastName}
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                        {driver.email}
                    </Text>
                    <View className="flex-row items-center mt-2">
                        <View
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
                        />
                        <Text className="text-xs font-medium" style={{ color: isOnline ? '#22c55e' : '#9ca3af' }}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View className="flex-row px-4 gap-3 mb-4">
                    <Button title="Call" onPress={handleCallDriver} variant="secondary" size="sm" icon="call" />
                    <Button
                        title={isOnline ? 'Set Offline' : 'Set Online'}
                        onPress={handleToggleOnline}
                        variant={isOnline ? 'danger' : 'primary'}
                        size="sm"
                        icon={isOnline ? 'close-circle' : 'checkmark-circle'}
                    />
                </View>

                {/* Stats */}
                <View className="mx-4 rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-sm font-semibold mb-3" style={{ color: theme.colors.text }}>
                        Activity
                    </Text>
                    <View className="flex-row justify-between">
                        <View className="items-center flex-1">
                            <Text className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                                {activeOrders.length}
                            </Text>
                            <Text className="text-[10px]" style={{ color: theme.colors.subtext }}>
                                Active Orders
                            </Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                                {driver.totalDeliveries ?? '—'}
                            </Text>
                            <Text className="text-[10px]" style={{ color: theme.colors.subtext }}>
                                Total Deliveries
                            </Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                                {driver.phone || '—'}
                            </Text>
                            <Text className="text-[10px]" style={{ color: theme.colors.subtext }}>
                                Phone
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Active Orders */}
                <View className="px-4">
                    <Text className="text-sm font-semibold mb-3" style={{ color: theme.colors.text }}>
                        Active Orders ({activeOrders.length})
                    </Text>
                    {activeOrders.length === 0 ? (
                        <View className="rounded-2xl p-6 items-center" style={{ backgroundColor: theme.colors.card }}>
                            <Ionicons name="receipt-outline" size={32} color={theme.colors.subtext} />
                            <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                                No active orders
                            </Text>
                        </View>
                    ) : (
                        activeOrders.map((order: any) => (
                            <TouchableOpacity
                                key={order.id}
                                className="rounded-xl p-3.5 mb-2"
                                style={{ backgroundColor: theme.colors.card }}
                                onPress={() => router.push(`/order/${order.id}`)}
                                activeOpacity={0.7}>
                                <View className="flex-row items-center justify-between">
                                    <StatusBadge status={order.status} />
                                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                        {formatRelativeTime(order.orderDate)}
                                    </Text>
                                </View>
                                <Text className="text-sm font-medium mt-1.5" style={{ color: theme.colors.text }}>
                                    {order.businesses?.[0]?.business?.name || 'Order'}
                                </Text>
                                <Text className="text-sm font-bold mt-1" style={{ color: theme.colors.text }}>
                                    {formatCurrency(order.totalPrice)}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
