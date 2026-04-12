import { View, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartFloatingBar } from '@/modules/cart/components/CartFloatingBar';
import { OrdersFloatingBar } from '@/modules/orders/components/OrdersFloatingBar';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
import { useAwaitingApprovalModalStore } from '@/store/useAwaitingApprovalModalStore';
import { useEffect, useState } from 'react';

export const FloatingBars = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const successModalVisible = useSuccessModalStore((state) => state.visible);
    const successModalType = useSuccessModalStore((state) => state.type);
    const suppressCartBarUntil = useSuccessModalStore((state) => state.suppressCartBarUntil);
    const awaitingApprovalVisible = useAwaitingApprovalModalStore((state) => state.visible);
    const [isPostSuccessCooldownActive, setIsPostSuccessCooldownActive] = useState(false);

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

    useEffect(() => {
        const remainingMs = suppressCartBarUntil - Date.now();
        if (remainingMs <= 0) {
            setIsPostSuccessCooldownActive(false);
            return;
        }

        setIsPostSuccessCooldownActive(true);
        const timeoutId = setTimeout(() => {
            setIsPostSuccessCooldownActive(false);
        }, remainingMs);

        return () => clearTimeout(timeoutId);
    }, [suppressCartBarUntil]);

    const hideForOrderCreatedTransition =
        (successModalVisible && successModalType === 'order_created') ||
        awaitingApprovalVisible;

    const shouldHideOrdersBar = hideForOrderCreatedTransition;
    const shouldHideCartBar = hideForOrderCreatedTransition || isPostSuccessCooldownActive;

    // Deterministic hide/show avoids rare stuck low-opacity states observed
    // after rapid modal + navigation transitions.
    if (shouldHide || (shouldHideOrdersBar && shouldHideCartBar)) {
        return null;
    }

    return (
        <View
            className="absolute left-4 right-4 gap-3"
            style={{ bottom: bottomPosition, zIndex: 50 }}
            pointerEvents="box-none"
        >
            {!shouldHideOrdersBar && <OrdersFloatingBar />}
            {!shouldHideCartBar && <CartFloatingBar />}
        </View>
    );
};
