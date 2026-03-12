import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApolloClient } from '@apollo/client/react';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { GET_ORDER } from '@/graphql/operations/orders';
import { toast } from '@/store/toastStore';

export const OrdersFloatingBar = () => {
    const router = useRouter();
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const { t } = useTranslations();

    const { hasActiveOrders, activeOrders } = useActiveOrdersStore();

    if (!hasActiveOrders || activeOrders.length === 0) return null;

    // Since we only support 1 active order, take the first one
    const activeOrder = activeOrders[0] as any;
    const customerVisibleStatus = activeOrder.status === 'READY' ? 'PREPARING' : activeOrder.status;

    // Get business names
    const businessNames = activeOrder.businesses.map(b => b.business.name).join(', ');
    const displayBusinessName = businessNames.length > 30 ? businessNames.substring(0, 30) + '...' : businessNames;

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
            case 'PENDING':
                return {
                    label: t.orders.status.pending,
                    message: t.orders.status_messages.pending,
                    bgColor: '#F59E0B', // Amber
                    icon: 'time-outline' as const,
                };
            case 'PREPARING':
            case 'READY':
                return {
                    label: t.orders.status.preparing,
                    message: t.orders.status_messages.preparing,
                    bgColor: '#7C3AED', // Purple
                    icon: 'restaurant-outline' as const,
                };
            case 'OUT_FOR_DELIVERY':
                return {
                    label: t.orders.status.out_for_delivery,
                    message: t.orders.status_messages.out_for_delivery,
                    bgColor: '#7C3AED', // Purple
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
                    message: 'Your order is being processed',
                    bgColor: theme.colors.primary,
                    icon: 'hourglass-outline' as const,
                };
        }
    };

    const statusInfo = getStatusInfo(customerVisibleStatus);

    const handlePress = async () => {
        try {
            const result = await apolloClient.query({
                query: GET_ORDER,
                variables: { id: activeOrder.id },
                fetchPolicy: 'network-only',
            });

            if (!result.data?.order) {
                toast.warning(t.common.error, t.orders.banner_unavailable);
                return;
            }

            router.push(`/orders/${activeOrder.id}`);
        } catch (error) {
            console.warn('[OrdersFloatingBar] Failed to load active order before navigation:', error);
            toast.warning(t.common.error, t.orders.banner_connection_lost);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                void handlePress();
            }}
            className="flex-row items-center justify-between p-4 rounded-2xl w-full"
            style={{ backgroundColor: statusInfo.bgColor }}
        >
            <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-white/20 p-2 rounded-full">
                    <Ionicons name={statusInfo.icon} size={20} color="white" />
                </View>
                <View className="flex-1">
                    <Text className="text-white font-semibold text-base">{t.orders.active_bar}</Text>
                    <Text className="text-white/80 text-xs" numberOfLines={1}>
                        {displayBusinessName}
                    </Text>
                    <Text className="text-white/70 text-xs mt-0.5" numberOfLines={1}>
                        {statusInfo.message}
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
        </TouchableOpacity>
    );
};
