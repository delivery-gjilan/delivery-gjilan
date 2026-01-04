import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';

export const CartFloatingBar = () => {
    const router = useRouter();
    const { total, count, isEmpty } = useCart();

    if (isEmpty) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/cart')}
            className="bg-primary flex-row items-center justify-between p-4 rounded-2xl shadow-lg elevation-5"
        >
            <View className="flex-row items-center space-x-3 gap-3">
                <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-white font-bold">{count}</Text>
                </View>
                <Text className="text-white font-medium text-lg">View Cart</Text>
            </View>
            <View className="flex-row items-center space-x-1">
                <Text className="text-white font-bold text-lg">€{total.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
        </TouchableOpacity>
    );
};
