import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useActiveOrdersStore } from '../store/activeOrdersStore';

export const OrdersFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();

    const { hasActiveOrders, activeOrders } = useActiveOrdersStore();

    if (!hasActiveOrders || activeOrders.length === 0) return null;

    // Since we only support 1 active order, take the first one
    const activeOrder = activeOrders[0];

    // Get business names
    const businessNames = activeOrder.businesses.map(b => b.business.name).join(', ');
    const displayBusinessName = businessNames.length > 25 ? businessNames.substring(0, 25) + '...' : businessNames;

    // Determine status text and color
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'PENDING':
                return { text: 'PENDING', color: '#F59E0B' }; // Amber
            case 'ACCEPTED':
                return { text: 'ACCEPTED', color: '#3B82F6' }; // Blue
            case 'READY':
                return { text: 'READY', color: '#2563EB' }; // Blue
            case 'OUT_FOR_DELIVERY':
                return { text: 'OUT FOR DELIVERY', color: '#8B5CF6' }; // Purple
            default:
                return { text: 'IN PROGRESS', color: theme.colors.income }; // Green
        }
    };

    const statusInfo = getStatusInfo(activeOrder.status);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/orders/${activeOrder.id}`)}
            className="flex-row items-center justify-between p-4 rounded-2xl shadow-lg elevation-5"
            style={{ backgroundColor: statusInfo.color }}
        >
            <View className="flex-row items-center space-x-3 gap-3">
                <View className="bg-white/20 p-2 rounded-full">
                    <Ionicons name="receipt-outline" size={20} color="white" />
                </View>
                <View className="flex-1">
                    <Text className="text-white font-semibold text-base">Active Order</Text>
                    <Text className="text-white/80 text-xs" numberOfLines={1}>{displayBusinessName}</Text>
                </View>
            </View>
            <View className="flex-row items-center space-x-1">
                <View className="bg-white/20 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">{statusInfo.text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
        </TouchableOpacity>
    );
};
