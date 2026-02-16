import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Order } from '@/gql/graphql';
import { Image } from 'expo-image';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useEffect, useRef, useState } from 'react';
import { useCartActions } from '@/modules/cart';

interface OrderDetailsProps {
    order: Order | null;
    loading?: boolean;
}

export const OrderDetails = ({ order, loading }: OrderDetailsProps) => {
    const router = useRouter();
    const theme = useTheme();
    const prevStatusRef = useRef<string | null>(null);
    const { clearCart } = useCartActions();
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressDraft, setAddressDraft] = useState('');
    const [addressOverride, setAddressOverride] = useState<string | null>(null);

    const { data: driverData, refetch: refetchDriver } = useQuery(
        gql`
            query GetOrderDriver($id: ID!) {
                order(id: $id) {
                    id
                    status
                    driver {
                        id
                        firstName
                        lastName
                        phoneNumber
                    }
                }
            }
        `,
        {
            variables: { id: order?.id ?? '' },
            skip: !order?.id,
            fetchPolicy: 'cache-and-network',
            notifyOnNetworkStatusChange: true,
        },
    );

    // Detect when order status changes to DELIVERED
    useEffect(() => {
        if (order && prevStatusRef.current !== null && prevStatusRef.current !== 'DELIVERED' && order.status === 'DELIVERED') {
            // Clear the cart
            clearCart();
            
            // Immediately navigate to home to close all modals
            router.replace('/(tabs)/home');
            
            // Show success alert after a brief delay to ensure navigation completes
            setTimeout(() => {
                Alert.alert(
                    '🎉 Order Delivered!',
                    'Your order has been successfully delivered. Thank you for your order!',
                    [{ text: 'OK' }]
                );
            }, 300);
        }
        
        if (order) {
            prevStatusRef.current = order.status;
        }
    }, [order?.status, router, clearCart]);

    useEffect(() => {
        if (order?.dropOffLocation?.address) {
            setAddressDraft(order.dropOffLocation.address);
        }
    }, [order?.dropOffLocation?.address]);

    useEffect(() => {
        if (!order?.id) return;
        if (order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') {
            refetchDriver();
        }
    }, [order?.id, order?.status, refetchDriver]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.colors.income} />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 px-4">
                    <View className="flex-row items-center mb-6 pt-2">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-foreground">Order Details</Text>
                    </View>

                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="alert-circle-outline" size={80} color={theme.colors.subtext} />
                        <Text className="text-lg text-foreground mt-4">Order not found</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const formatStatus = (value: string) =>
        value
            .toLowerCase()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const getStatusColor = (status: string) => {
        const statusColors: Record<string, { bg: string; dot: string }> = {
            PENDING: { bg: '#FEF3C7', dot: '#FBBF24' },
            CONFIRMED: { bg: '#DBEAFE', dot: '#3B82F6' },
            OUT_FOR_DELIVERY: { bg: '#CFFAFE', dot: '#06B6D4' },
            DELIVERED: { bg: '#DCFCE7', dot: '#22C55E' },
            CANCELLED: { bg: '#FEE2E2', dot: '#EF4444' },
        };
        return statusColors[status] || { bg: '#F3F4F6', dot: '#9CA3AF' };
    };

    const formatDuration = (ms: number) => {
        if (!Number.isFinite(ms) || ms <= 0) return '0m';
        const totalMinutes = Math.floor(ms / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(' ');
    };

    const getOrderDuration = () => {
        const start = new Date(order.orderDate).getTime();
        if (Number.isNaN(start)) return null;
        const end = order.status === 'DELIVERED' && order.updatedAt ? new Date(order.updatedAt).getTime() : Date.now();
        if (Number.isNaN(end)) return null;
        return formatDuration(Math.max(0, end - start));
    };

    const statusLabel = formatStatus(order.status);
    const statusColor = getStatusColor(order.status);
    const orderDuration = getOrderDuration();
    const displayAddress = addressOverride ?? order.dropOffLocation.address;
    const driver = (driverData as any)?.order?.driver ?? (order as any)?.driver ?? (order as any)?.assignedDriver ?? (order as any)?.courier ?? null;
    const driverName = driver?.firstName ? `${driver.firstName} ${driver?.lastName || ''}`.trim() : null;
    const driverPhone = driver?.phone || driver?.phoneNumber || driver?.mobile || null;
    const driverVehicle = driver?.vehicle || driver?.vehicleType || null;

    const handleCallDriver = async () => {
        if (!driverPhone) return;
        try {
            await Linking.openURL(`tel:${driverPhone}`);
        } catch {
            Alert.alert('Call Failed', 'Unable to open the phone dialer.');
        }
    };

    const handleSaveAddress = () => {
        const next = addressDraft.trim();
        if (!next) return;
        setAddressOverride(next);
        setIsEditingAddress(false);
        Alert.alert('Address Updated', 'Address updated for this view.');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* Softer Header */}
                <View className="pb-2 pt-2">
                    <View className="flex-row items-center justify-between mb-1">
                        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text className="text-sm text-subtext font-medium flex-1 ml-2">ACTIVE ORDER</Text>
                        <Ionicons name="checkmark-circle" size={20} style={{ color: statusColor.dot }} />
                    </View>
                    <Text className="text-3xl font-bold text-foreground">#{order.id?.slice(0, 8)}</Text>
                    <Text className="text-sm text-subtext mt-1">Real-time tracking updates</Text>
                </View>

                {/* Status Card */}
                <View className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-4 border border-border/20" style={{ backgroundColor: statusColor.bg }}>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-xs text-subtext font-semibold mb-1">Current Status</Text>
                            <Text className="text-xl font-bold text-foreground">{statusLabel}</Text>
                            {orderDuration && (
                                <Text className="text-xs text-subtext mt-2">
                                    {order.status === 'DELIVERED' ? 'Delivery time' : 'Elapsed'}: {orderDuration}
                                </Text>
                            )}
                        </View>
                        <View className="items-center">
                            <View className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: statusColor.dot }} />
                            <Text className="text-xs font-semibold" style={{ color: statusColor.dot }}>
                                Live
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Driver Info Card */}
                {(driverName || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') && (
                    <View className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-4">
                        <View className="flex-row items-center mb-3">
                            <Ionicons name="person-circle" size={24} style={{ color: theme.colors.income }} />
                            <Text className="text-lg font-bold text-foreground ml-3">Driver</Text>
                        </View>
                        <View className="flex-row items-center justify-between pt-3 border-t border-border/20">
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-foreground">
                                    {driverName || 'Assigning driver...'}
                                </Text>
                                <Text className="text-sm text-subtext mt-1">
                                    {driverVehicle || (driverPhone ? driverPhone : 'Driver assignment in progress')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCallDriver}
                                disabled={!driverPhone}
                                className="w-12 h-12 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: driverPhone ? theme.colors.income : theme.colors.border,
                                }}
                            >
                                <Ionicons name="call" size={20} color={driverPhone ? 'white' : theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Delivery Address Card */}
                <View className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                            <Ionicons name="location" size={20} style={{ color: theme.colors.income }} />
                            <Text className="text-lg font-bold text-foreground ml-3">Delivery</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsEditingAddress((prev) => !prev)}
                            className="flex-row items-center px-3 py-2 rounded-lg"
                            style={{ backgroundColor: theme.colors.border }}
                        >
                            <Ionicons name="pencil" size={14} color={theme.colors.text} />
                            <Text className="text-xs ml-1 font-semibold" style={{ color: theme.colors.text }}>
                                Edit
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {!isEditingAddress ? (
                        <View className="pt-2">
                            <Text className="text-base text-foreground leading-6">{displayAddress}</Text>
                        </View>
                    ) : (
                        <View className="pt-2">
                            <TextInput
                                value={addressDraft}
                                onChangeText={setAddressDraft}
                                placeholder="Enter delivery address"
                                placeholderTextColor={theme.colors.subtext}
                                className="text-base px-3 py-3 rounded-xl mb-3"
                                style={{
                                    color: theme.colors.text,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            />
                            <View className="flex-row justify-end gap-2">
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsEditingAddress(false);
                                        setAddressDraft(displayAddress);
                                    }}
                                    className="px-4 py-2 rounded-lg"
                                    style={{ backgroundColor: theme.colors.border }}
                                >
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveAddress}
                                    className="px-4 py-2 rounded-lg"
                                    style={{ backgroundColor: theme.colors.income }}
                                >
                                    <Text className="text-sm font-semibold text-white">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Driver Info */}
                <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
                    <Text className="text-lg font-bold text-foreground mb-3">Driver</Text>
                    <View className="flex-row items-center">
                        <View
                            className="w-12 h-12 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: theme.colors.border }}
                        >
                            <Ionicons name="person" size={20} color={theme.colors.subtext} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-foreground">
                                {driverName || 'Driver not assigned yet'}
                            </Text>
                            <Text className="text-sm text-subtext">
                                {driverVehicle || (driverPhone ? driverPhone : 'We’ll notify you once a driver is assigned.')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCallDriver}
                            disabled={!driverPhone}
                            className="px-3 py-2 rounded-full"
                            style={{
                                backgroundColor: driverPhone ? theme.colors.income : theme.colors.border,
                            }}
                        >
                            <Ionicons name="call" size={18} color={driverPhone ? 'white' : theme.colors.subtext} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Order Items by Business */}
                {order.businesses.map((businessOrder, index) => (
                    <View key={index} className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-4">
                        <View className="flex-row items-center mb-3">
                            {businessOrder.business.imageUrl ? (
                                <Image
                                    source={{ uri: businessOrder.business.imageUrl }}
                                    className="w-14 h-14 rounded-xl mr-3"
                                />
                            ) : (
                                <View
                                    className="w-14 h-14 rounded-xl mr-3 items-center justify-center"
                                    style={{
                                        backgroundColor: theme.colors.income + '15',
                                        borderWidth: 1,
                                        borderColor: theme.colors.income + '40',
                                    }}
                                >
                                    <Ionicons name="storefront-outline" size={20} color={theme.colors.income} />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-foreground">{businessOrder.business.name}</Text>
                                <Text className="text-sm text-foreground">
                                    {businessOrder.items.length} item
                                    {businessOrder.items.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>

                        {businessOrder.items.map((item, itemIndex) => (
                            <View key={itemIndex} className="flex-row items-center py-3 border-t border-border">
                                <View
                                    className="w-12 h-12 rounded-xl mr-3 items-center justify-center overflow-hidden"
                                    style={{
                                        backgroundColor: theme.colors.income + '15',
                                        borderWidth: 1,
                                        borderColor: theme.colors.income + '40',
                                    }}
                                >
                                    {item.imageUrl ? (
                                        <Image source={{ uri: item.imageUrl }} className="w-12 h-12" />
                                    ) : (
                                        <Ionicons name="fast-food-outline" size={18} color={theme.colors.income} />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base text-foreground">{item.name}</Text>
                                    <Text className="text-sm text-subtext">Qty: {item.quantity}</Text>
                                </View>
                                <Text className="text-base font-semibold text-foreground">
                                    €{(item.price * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Order Summary */}
                <View className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="receipt" size={20} style={{ color: theme.colors.income }} />
                        <Text className="text-lg font-bold text-foreground ml-3">Order Summary</Text>
                    </View>

                    <View className="space-y-2 pb-4">
                        <View className="flex-row justify-between">
                            <Text className="text-base text-foreground">Subtotal</Text>
                            <Text className="text-base text-foreground">€{order.orderPrice.toFixed(2)}</Text>
                        </View>

                        <View className="flex-row justify-between">
                            <Text className="text-base text-foreground">Delivery Fee</Text>
                            <Text className="text-base text-foreground">€{order.deliveryPrice.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View className="border-t border-border pt-4 flex-row justify-between">
                        <Text className="text-lg font-bold text-foreground">Total</Text>
                        <Text className="text-lg font-bold" style={{ color: theme.colors.income }}>€{order.totalPrice.toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
