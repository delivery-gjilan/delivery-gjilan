import { View, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartFloatingBar } from '@/modules/cart/components/CartFloatingBar';
import { OrdersFloatingBar } from '@/modules/orders/components/OrdersFloatingBar';

export const FloatingBars = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Routes where floating bars should not appear
    const hiddenRoutes = ['/product/', '/cart', '/orders', '/login', '/signup', '/auth-selection', '/profile', '/addresses', '/business/'];
    const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';

    // Check if we're on a tab route
    const tabRoutes = ['/market', '/home', '/profile', '/restaurants', '/analytics'];
    const isOnTabRoute = tabRoutes.some((route) => pathname === route || pathname.startsWith(route));

    const bottomPosition = Platform.OS === 'ios'
        ? isOnTabRoute ? 64 + insets.bottom : 20 + insets.bottom
        : isOnTabRoute ? 56 + insets.bottom : 20 + insets.bottom;

    // Keep children mounted even when hidden so OrdersFloatingBar / CartFloatingBar
    // never lose their animation or state due to route transitions.
    // Visual hiding via opacity + pointer-event blocking is enough.
    return (
        <View
            className="absolute left-4 right-4 gap-3"
            style={{ bottom: bottomPosition, zIndex: 50, opacity: shouldHide ? 0 : 1 }}
            pointerEvents={shouldHide ? 'none' : 'box-none'}
        >
            <OrdersFloatingBar />
            <CartFloatingBar />
        </View>
    );
};
