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

    const statusLabel = formatStatus(order.status);
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
                <View className="flex-row items-center mb-6 pt-2">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="close" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-foreground">Active Order</Text>
                </View>

                {/* Current Status */}
                <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-xs text-subtext mb-1">Current status</Text>
                            <Text className="text-xl font-bold text-foreground">{statusLabel}</Text>
                        </View>
                        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.colors.income + '20' }}>
                            <Text className="text-xs font-semibold" style={{ color: theme.colors.income }}>
                                Live
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Delivery Location */}
                <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-lg font-bold text-foreground">Delivery Address</Text>
                        <TouchableOpacity
                            onPress={() => setIsEditingAddress((prev) => !prev)}
                            className="flex-row items-center"
                        >
                            <Ionicons name="pencil" size={16} color={theme.colors.income} />
                            <Text className="text-sm ml-1" style={{ color: theme.colors.income }}>
                                Edit
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {!isEditingAddress ? (
                        <View className="flex-row items-start">
                            <Ionicons
                                name="location-outline"
                                size={20}
                                color={theme.colors.income}
                                style={{ marginTop: 2 }}
                            />
                            <Text className="text-base text-foreground ml-2 flex-1">{displayAddress}</Text>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                value={addressDraft}
                                onChangeText={setAddressDraft}
                                placeholder="Enter delivery address"
                                placeholderTextColor={theme.colors.subtext}
                                className="text-base px-3 py-2 rounded-lg"
                                style={{
                                    color: theme.colors.text,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            />
                            <View className="flex-row justify-end mt-3">
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsEditingAddress(false);
                                        setAddressDraft(displayAddress);
                                    }}
                                    className="px-4 py-2 rounded-lg mr-2"
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
                    <View key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
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
                <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-6">
                    <Text className="text-lg font-bold text-foreground mb-3">Order Summary</Text>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base text-foreground">Subtotal</Text>
                        <Text className="text-base text-foreground">€{order.orderPrice.toFixed(2)}</Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base text-foreground">Delivery Fee</Text>
                        <Text className="text-base text-foreground">€{order.deliveryPrice.toFixed(2)}</Text>
                    </View>

                    <View className="flex-row justify-between pt-2 border-t border-border">
                        <Text className="text-lg font-bold text-foreground">Total</Text>
                        <Text className="text-lg font-bold text-foreground">€{order.totalPrice.toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
