import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Order } from '@/gql/graphql';
import { Image } from 'expo-image';

interface OrderDetailsProps {
    order: Order | null;
    loading?: boolean;
}

const OrderStatusTimeline = ({ status }: { status: string }) => {
    const theme = useTheme();

    const statuses = [
        { key: 'PENDING', label: 'Pending', icon: 'time-outline' },
        { key: 'ACCEPTED', label: 'Accepted', icon: 'checkmark-circle-outline' },
        { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'bicycle-outline' },
        { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-circle-outline' },
    ];

    const currentIndex = statuses.findIndex((s) => s.key === status);

    return (
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
            <Text className="text-lg font-bold text-text-primary mb-4">Order Status</Text>
            {statuses.map((s, index) => {
                const isActive = index <= currentIndex;
                const isCurrent = s.key === status;

                return (
                    <View key={s.key} className="flex-row items-center mb-3">
                        <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{
                                backgroundColor: isActive ? theme.colors.income : theme.colors.border,
                            }}
                        >
                            <Ionicons
                                name={s.icon as keyof typeof Ionicons.glyphMap}
                                size={20}
                                color={isActive ? 'white' : theme.colors.subtext}
                            />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text
                                className={`text-base ${isCurrent ? 'font-bold' : 'font-medium'}`}
                                style={{
                                    color: isActive ? theme.colors.text : theme.colors.subtext,
                                }}
                            >
                                {s.label}
                            </Text>
                        </View>
                        {isCurrent && (
                            <View
                                className="px-2 py-1 rounded-full"
                                style={{ backgroundColor: theme.colors.income + '20' }}
                            >
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.income }}>
                                    Current
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

export const OrderDetails = ({ order, loading }: OrderDetailsProps) => {
    const router = useRouter();
    const theme = useTheme();

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

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center mb-6 pt-2">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="close" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-foreground">Order #{order.id.slice(-6)}</Text>
                </View>

                <OrderStatusTimeline status={order.status} />

                {/* Delivery Location */}
                <View className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
                    <Text className="text-lg font-bold text-foreground mb-3">Delivery Address</Text>
                    <View className="flex-row items-start">
                        <Ionicons
                            name="location-outline"
                            size={20}
                            color={theme.colors.income}
                            style={{ marginTop: 2 }}
                        />
                        <Text className="text-base text-foreground ml-2 flex-1">{order.dropOffLocation.address}</Text>
                    </View>
                </View>

                {/* Order Items by Business */}
                {order.businesses.map((businessOrder, index) => (
                    <View key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4">
                        <View className="flex-row items-center mb-3">
                            {businessOrder.business.imageUrl && (
                                <Image
                                    source={{ uri: businessOrder.business.imageUrl }}
                                    className="w-12 h-12 rounded-lg mr-3"
                                />
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
                            <View key={itemIndex} className="flex-row items-center py-2 border-t border-border">
                                {item.imageUrl && (
                                    <Image source={{ uri: item.imageUrl }} className="w-10 h-10 rounded-lg mr-3" />
                                )}
                                <View className="flex-1">
                                    <Text className="text-base text-foreground">{item.name}</Text>
                                    <Text className="text-sm text-foreground">Qty: {item.quantity}</Text>
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
