import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';

export const CartFloatingBar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { total, count, isEmpty } = useCart();

    if (isEmpty) return null;

    // Don't show on product detail pages
    if (pathname.startsWith('/product/')) return null;

    // Check if we're on a tab route (adjust these paths based on your tab routes)
    const tabRoutes = ['/analytics', '/home', '/profile']; // Add your actual tab routes here
    const isOnTabRoute = tabRoutes.some((route) => pathname === route || pathname.startsWith(route));

    // Calculate bottom position based on whether tab bar is visible
    const getBottomPosition = () => {
        if (Platform.OS === 'ios') {
            return isOnTabRoute ? 90 + insets.bottom : 20 + insets.bottom;
        } else {
            return isOnTabRoute ? 70 + insets.bottom : 20 + insets.bottom;
        }
    };

    return (
        <View
            className="absolute left-4 right-4"
            style={{
                bottom: getBottomPosition(),
                zIndex: 50,
            }}
        >
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
        </View>
    );
};
