import { View, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartFloatingBar } from '@/modules/cart/components/CartFloatingBar';
import { OrdersFloatingBar } from '@/modules/orders/components/OrdersFloatingBar';

export const FloatingBars = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Routes where floating bars should not appear
    const hiddenRoutes = ['/product/', '/cart', '/orders'];
    const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route));

    if (shouldHide) return null;

    // Check if we're on a tab route
    const tabRoutes = ['/analytics', '/home', '/profile'];
    const isOnTabRoute = tabRoutes.some((route) => pathname === route || pathname.startsWith(route));

    // Calculate bottom position based on whether tab bar is visible
    const getBottomPosition = () => {
        if (Platform.OS === 'ios') {
            return isOnTabRoute ? 90 + insets.bottom : 20 + insets.bottom;
        }
        return isOnTabRoute ? 70 + insets.bottom : 20 + insets.bottom;
    };

    return (
        <View
            className="absolute left-4 right-4 gap-3"
            style={{
                bottom: getBottomPosition(),
                zIndex: 50,
            }}
            pointerEvents="box-none"
        >
            <OrdersFloatingBar />
            <CartFloatingBar />
        </View>
    );
};
