import { View, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartFloatingBar } from '@/modules/cart/components/CartFloatingBar';
import { OrdersFloatingBar } from '@/modules/orders/components/OrdersFloatingBar';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

export const FloatingBars = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Routes where floating bars should not appear
    const hiddenRoutes = [
        '/product/', '/cart', '/orders', '/business/',
        '/login', '/signup', '/auth-selection', '/forgot-password', '/reset-password', '/brand-splash',
        '/profile', '/addresses',
    ];
    const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';

    // Check if we're on a tab route
    const tabRoutes = ['/market', '/home', '/profile', '/restaurants', '/analytics'];
    const isOnTabRoute = tabRoutes.some((route) => pathname === route || pathname.startsWith(route));

    const bottomPosition = Platform.OS === 'ios'
        ? isOnTabRoute ? 64 + insets.bottom : 20 + insets.bottom
        : isOnTabRoute ? 56 + insets.bottom : 20 + insets.bottom;

    // Animate opacity so the bars don't hard-snap during back-navigation transitions.
    // Hide instantly (0ms) to avoid showing bars on entry to a hidden route,
    // but fade in slowly (250ms) when returning so the bar doesn't flash mid-transition.
    const opacity = useSharedValue(shouldHide ? 0 : 1);
    useEffect(() => {
        opacity.value = withTiming(shouldHide ? 0 : 1, { duration: shouldHide ? 0 : 250 });
    }, [shouldHide]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            className="absolute left-4 right-4 gap-3"
            style={[{ bottom: bottomPosition, zIndex: 50 }, animatedStyle]}
            pointerEvents={shouldHide ? 'none' : 'box-none'}
        >
            <OrdersFloatingBar />
            <CartFloatingBar />
        </Animated.View>
    );
};
