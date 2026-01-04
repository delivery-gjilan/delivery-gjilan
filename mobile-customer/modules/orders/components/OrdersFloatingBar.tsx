import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useActiveOrdersStore } from '../store/activeOrdersStore';

export const OrdersFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();

    const { hasActiveOrders, activeOrders } = useActiveOrdersStore();

    if (!hasActiveOrders) return null;

    const activeOrdersCount = activeOrders.length;

    // Determine the most urgent status
    const hasOutForDelivery = activeOrders.some((order) => order.status === 'OUT_FOR_DELIVERY');
    const statusText = hasOutForDelivery ? 'OUT FOR DELIVERY' : 'IN PROGRESS';

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/orders/active')}
            className="flex-row items-center justify-between p-4 rounded-2xl shadow-lg elevation-5"
            style={{ backgroundColor: theme.colors.income }}
        >
            <View className="flex-row items-center space-x-3 gap-3">
                <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-white font-bold">{activeOrdersCount}</Text>
                </View>
                <Text className="text-white font-medium text-lg">Active Orders</Text>
            </View>
            <View className="flex-row items-center space-x-1">
                <View className="bg-white/20 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">{statusText}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
        </TouchableOpacity>
    );
};
