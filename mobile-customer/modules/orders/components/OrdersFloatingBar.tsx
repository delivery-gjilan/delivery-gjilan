import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { toast } from '@/store/toastStore';
import AwaitingApprovalModal from '@/components/AwaitingApprovalModal';
import { useAwaitingApprovalModalStore } from '@/store/useAwaitingApprovalModalStore';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const OrdersFloatingBar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const theme = useTheme();
    const { t } = useTranslations();

    const { hasActiveOrders, activeOrders } = useActiveOrdersStore();
    const { visible, orderId: modalOrderId, autoOpenOrderId, openModal, consumeAutoOpen, hideModal } =
        useAwaitingApprovalModalStore();

    const activeOrderCount = activeOrders.length;
    // For multiple active orders, we highlight the first one for status coloring
    // and route users to the active-orders list.
    const activeOrder = activeOrders[0] as any;
    const activeOrderId = activeOrder?.id === null || activeOrder?.id === undefined ? null : String(activeOrder.id);
    const customerVisibleStatus = activeOrder?.status === 'READY' ? 'PREPARING' : activeOrder?.status;
    const isAwaitingApproval = activeOrder?.status === 'AWAITING_APPROVAL';

    useEffect(() => {
        if (!autoOpenOrderId) return;

        const matchingAwaitingOrder = activeOrders.find(
            (order: any) => String(order?.id) === autoOpenOrderId && order?.status === 'AWAITING_APPROVAL',
        );

        if (!matchingAwaitingOrder) return;

        openModal(autoOpenOrderId);
        consumeAutoOpen(autoOpenOrderId);
    }, [autoOpenOrderId, activeOrders, openModal, consumeAutoOpen]);

    // Get business names
    const orderBusinesses = Array.isArray(activeOrder?.businesses) ? activeOrder.businesses : [];
    const businessNames = orderBusinesses
        .map((b: any) => (typeof b?.business?.name === 'string' ? b.business.name : ''))
        .filter(Boolean)
        .join(', ');
    const displayBusinessName = businessNames
        ? businessNames.length > 30
            ? businessNames.substring(0, 30) + '...'
            : businessNames
        : t.orders.active_bar;

    const liveEtaSeconds = activeOrder?.driver?.driverConnection?.remainingEtaSeconds;
    const liveEtaUpdatedAt = activeOrder?.driver?.driverConnection?.etaUpdatedAt;
    const liveEtaMs = liveEtaUpdatedAt ? new Date(liveEtaUpdatedAt).getTime() : 0;
    const liveEtaFresh =
        customerVisibleStatus === 'OUT_FOR_DELIVERY' &&
        typeof liveEtaSeconds === 'number' &&
        Number.isFinite(liveEtaSeconds) &&
        liveEtaMs > 0 &&
        Date.now() - liveEtaMs <= 20_000;

    const prepEta = (() => {
        if (customerVisibleStatus !== 'PREPARING') return null;
        const prepTotal = Number(activeOrder.preparationMinutes ?? 0);
        if (!Number.isFinite(prepTotal) || prepTotal <= 0) return null;
        const prepStart = activeOrder.preparingAt || activeOrder.orderDate;
        const prepStartMs = prepStart ? new Date(prepStart).getTime() : 0;
        if (!prepStartMs || Number.isNaN(prepStartMs)) return Math.max(1, Math.round(prepTotal));
        const elapsedMin = Math.max(0, (Date.now() - prepStartMs) / 60000);
        return Math.max(1, Math.ceil(prepTotal - elapsedMin));
    })();

    const deliveryEta = (() => {
        if (!liveEtaFresh) return null;
        if (liveEtaSeconds <= 0) return 0;
        return Math.max(1, Math.round(liveEtaSeconds / 60));
    })();

    const etaMinutes = customerVisibleStatus === 'PREPARING' ? prepEta : customerVisibleStatus === 'OUT_FOR_DELIVERY' ? deliveryEta : null;
    const etaLabel = customerVisibleStatus === 'PREPARING' ? t.orders.details.est_ready : customerVisibleStatus === 'OUT_FOR_DELIVERY' ? t.orders.details.est_delivery : '';

    // Determine status info with stronger colors
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'AWAITING_APPROVAL':
                return {
                    label: t.orders.status.awaiting_approval,
                    message: t.orders.status_messages.awaiting_approval,
                    bgColor: '#F59E0B',
                    icon: 'shield-checkmark-outline' as const,
                };
            case 'PENDING':
                return {
                    label: t.orders.status.pending,
                    message: t.orders.status_messages.pending,
                    bgColor: '#F59E0B', // Amber
                    icon: 'time-outline' as const,
                };
            case 'PREPARING':
                return {
                    label: t.orders.status.preparing,
                    message: t.orders.status_messages.preparing,
                    bgColor: '#F97316', // Orange
                    icon: 'restaurant-outline' as const,
                };
            case 'READY':
                return {
                    label: t.orders.status.preparing,
                    message: t.orders.status_messages.preparing,
                    bgColor: '#3B82F6', // Blue
                    icon: 'bag-check-outline' as const,
                };
            case 'OUT_FOR_DELIVERY':
                return {
                    label: t.orders.status.out_for_delivery,
                    message: t.orders.status_messages.out_for_delivery,
                    bgColor: '#22C55E', // Green
                    icon: 'bicycle-outline' as const,
                };
            case 'CANCELLED':
                return {
                    label: t.orders.status.cancelled,
                    message: t.orders.status_messages.cancelled,
                    bgColor: '#EF4444', // Red
                    icon: 'close-circle-outline' as const,
                };
            case 'DELIVERED':
                return {
                    label: t.orders.status.delivered,
                    message: t.orders.status_messages.delivered,
                    bgColor: '#10B981', // Green
                    icon: 'checkmark-done-outline' as const,
                };
            default:
                return {
                    label: t.orders.status.in_progress,
                    message: t.orders.in_progress_message,
                    bgColor: theme.colors.primary,
                    icon: 'hourglass-outline' as const,
                };
        }
    };

    const statusInfo = getStatusInfo(customerVisibleStatus);
    const activeOrderTitle =
        activeOrderCount > 1 ? `${activeOrderCount} ${t.orders.active_orders}` : t.orders.active_bar;
    const activeOrderSubtitle =
        activeOrderCount > 1 ? t.orders.multiple_active_cta : displayBusinessName;
    const activeOrderHint =
        activeOrderCount > 1 ? t.orders.multiple_active_subtitle : statusInfo.message;

    const modalOrder = activeOrders.find((order: any) => String(order?.id) === String(modalOrderId));
    const modalApprovalReasons = Array.isArray((modalOrder as any)?.approvalReasons)
        ? (modalOrder as any).approvalReasons
        : undefined;

    // Slide-up entrance animation
    const translateY = useSharedValue(80);
    const opacity = useSharedValue(0);
    useEffect(() => {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    }, []);
    const slideStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    if (!hasActiveOrders || activeOrders.length === 0 || !activeOrder) {
        return null;
    }

    const handlePress = async () => {
        if (!activeOrderId) {
            console.warn('[OrdersFloatingBar] Press ignored: missing activeOrderId', {
                pathname,
                hasActiveOrders,
                activeOrdersCount: activeOrders.length,
            });
            toast.warning(t.common.error, t.orders.banner_unavailable);
            return;
        }

        console.log('[OrdersFloatingBar] Press -> navigate', {
            pathname,
            activeOrderId,
            status: activeOrder?.status,
            activeOrderCount,
        });

        if (activeOrderCount === 1 && isAwaitingApproval) {
            openModal(activeOrderId);
            return;
        }

        if (activeOrderCount > 1) {
            router.push('/orders/active');
            return;
        }

        router.push({
            pathname: '/orders/[orderId]',
            params: { orderId: activeOrderId },
        } as never);
    };

    return (
        <>
            <AnimatedTouchable
                activeOpacity={0.9}
                onPress={() => {
                    void handlePress();
                }}
                className="flex-row items-center justify-between p-4 rounded-2xl w-full"
                style={[{ backgroundColor: statusInfo.bgColor }, slideStyle]}
            >
                <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-white/20 p-2 rounded-full">
                        <Ionicons name={statusInfo.icon} size={20} color="white" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-semibold text-base">
                            {activeOrderTitle}
                        </Text>
                        <Text className="text-white/80 text-xs" numberOfLines={1}>
                            {activeOrderSubtitle}
                        </Text>
                        <Text className="text-white/70 text-xs mt-0.5" numberOfLines={1}>
                            {activeOrderHint}
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-center gap-1 ml-2">
                    <View className="bg-white/20 px-2 py-1 rounded-full">
                        <Text className="text-white text-xs font-semibold">{statusInfo.label}</Text>
                    </View>
                    {etaMinutes !== null && (
                        <View className="bg-white/20 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-semibold">~{etaMinutes} {t.orders.details.min_short}</Text>
                            <Text className="text-white/80 text-[10px] leading-3">{etaLabel}</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
            </AnimatedTouchable>

            <AwaitingApprovalModal
                visible={visible}
                approvalReasons={modalApprovalReasons}
                onClose={hideModal}
            />
        </>
    );
};
