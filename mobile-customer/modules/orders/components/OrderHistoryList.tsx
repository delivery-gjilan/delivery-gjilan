import { useMemo } from 'react';
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useOrders } from '../hooks/useOrders';
import { Order } from '@/gql/graphql';

type StatusStyles = {
    color: string;
    background: string;
};

const getStatusStyles = (status: string, fallback: string): StatusStyles => {
    switch (status) {
        case 'PENDING':
            return { color: '#F59E0B', background: '#F59E0B20' };
        case 'PREPARING':
        case 'READY':
        case 'OUT_FOR_DELIVERY':
            return { color: '#3B82F6', background: '#3B82F620' };
        case 'DELIVERED':
            return { color: '#22C55E', background: '#22C55E20' };
        case 'CANCELLED':
            return { color: '#EF4444', background: '#EF444420' };
        default:
            return { color: fallback, background: `${fallback}20` };
    }
};

const formatOrderDate = (value?: string | null) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const OrderHistoryItem = ({ order }: { order: Order }) => {
    const router = useRouter();
    const theme = useTheme();
    const status = order.status ?? 'UNKNOWN';
    const statusStyles = getStatusStyles(status, theme.colors.subtext);
    const totalItems = order.businesses.reduce(
        (sum, business) => sum + business.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
    );
    const businessesCount = order.businesses.length;
    const businessLabel =
        businessesCount === 1 ? order.businesses[0]?.business?.name ?? 'Restaurant' : `${businessesCount} restaurants`;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/orders/${order.id}` as `/orders/${string}`)}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl mb-3"
            style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
            }}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground mb-1">Order #{order.id.slice(-6)}</Text>
                    <Text className="text-sm text-subtext">{businessLabel}</Text>
                    <Text className="text-xs text-subtext mt-1">
                        {totalItems} item{totalItems !== 1 ? 's' : ''} • {formatOrderDate(order.orderDate)}
                    </Text>
                </View>
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyles.background }}>
                    <Text className="text-xs font-semibold" style={{ color: statusStyles.color }}>
                        {status.replace(/_/g, ' ')}
                    </Text>
                </View>
            </View>
            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-border">
                <Text className="text-base font-semibold text-foreground">€{order.totalPrice.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} />
            </View>
        </TouchableOpacity>
    );
};

export const OrderHistoryList = () => {
    const router = useRouter();
    const theme = useTheme();
    const { orders, loading } = useOrders();

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const bTime = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return bTime - aTime;
        });
    }, [orders]);

    if (loading && orders.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 px-4">
                    <View className="flex-row items-center mb-6 pt-2">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-text">Order history</Text>
                    </View>
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={theme.colors.income} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (sortedOrders.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 px-4">
                    <View className="flex-row items-center mb-6 pt-2">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-text">Order history</Text>
                    </View>
                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="receipt-outline" size={80} color={theme.colors.subtext} />
                        <Text className="text-lg text-subtext mt-4 text-center">No past orders yet</Text>
                        <Text className="text-sm text-subtext mt-2 text-center px-8">
                            Your completed and cancelled orders will show up here.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-4">
                <View className="flex-row items-center mb-6 pt-2">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-text">Order history</Text>
                </View>

                <FlatList
                    data={sortedOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderHistoryItem order={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </SafeAreaView>
    );
};
