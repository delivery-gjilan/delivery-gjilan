import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useTheme } from '@/hooks/useTheme';
import { Order } from '@/gql/graphql';

const OrderStatusBadge = ({ status }: { status: string }) => {
    const theme = useTheme();

    const getStatusColor = () => {
        switch (status) {
            case 'PENDING':
                return theme.colors.notification;
            case 'ACCEPTED':
                return theme.colors.income;
            case 'OUT_FOR_DELIVERY':
                return theme.colors.income;
            default:
                return theme.colors.subtext;
        }
    };

    return (
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: getStatusColor() + '20' }}>
            <Text className="text-xs font-semibold" style={{ color: getStatusColor() }}>
                {status.replace(/_/g, ' ')}
            </Text>
        </View>
    );
};

const OrderListItem = ({ order }: { order: Order }) => {
    const router = useRouter();
    const theme = useTheme();

    const totalItems = order.businesses.reduce(
        (sum, business) => sum + business.items.reduce((s, item) => s + item.quantity, 0),
        0,
    );

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
                    <Text className="text-sm text-subtext">
                        {totalItems} item{totalItems !== 1 ? 's' : ''} from {order.businesses.length} restaurant
                        {order.businesses.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <OrderStatusBadge status={order.status} />
            </View>

            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-border">
                <Text className="text-base font-semibold text-foreground">€{order.totalPrice.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} />
            </View>
        </TouchableOpacity>
    );
};

export const ActiveOrdersList = () => {
    const router = useRouter();
    const theme = useTheme();
    const { activeOrders, hasActiveOrders } = useActiveOrdersStore();

    if (!hasActiveOrders) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 px-4">
                    <View className="flex-row items-center mb-6 pt-2">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-text">Active Orders</Text>
                    </View>

                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="checkmark-circle-outline" size={80} color={theme.colors.subtext} />
                        <Text className="text-lg text-subtext mt-4 text-center">No active orders</Text>
                        <Text className="text-sm text-subtext mt-2 text-center px-8">
                            All your orders have been completed or cancelled
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
                    <Text className="text-2xl font-bold text-text">Active Orders</Text>
                </View>

                <FlatList
                    data={activeOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderListItem order={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </SafeAreaView>
    );
};
