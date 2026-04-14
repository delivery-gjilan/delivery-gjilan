import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { toast } from '@/store/toastStore';
import { useAwaitingApprovalModalStore } from '@/store/useAwaitingApprovalModalStore';
import { useEffect, useRef, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';

// Module-level flag so the entrance animation only plays once per app session.
// If the component remounts (e.g. due to a brief route flicker), it snaps
// instantly to the final position instead of fading in from zero.
let _entranceAnimationPlayed = false;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const OrdersFloatingBar = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();

    const { hasActiveOrders, activeOrders } = useActiveOrdersStore();
    const openModal = useAwaitingApprovalModalStore((state) => state.openModal);

    // Auto-open is now handled centrally in AwaitingApprovalModalContainer.

    const activeOrder = activeOrders[0];
    const activeOrderId = activeOrder?.id === null || activeOrder?.id === undefined ? null : String(activeOrder.id);
    const customerVisibleStatus = activeOrder?.status === 'READY' ? 'PREPARING' : activeOrder?.status;
    const isAwaitingApproval = activeOrder?.status === 'AWAITING_APPROVAL';

    // ─── Live countdown ─────────────────────────────────────────────────────────
    // Compute the authoritative remaining seconds from store data, then run a
    // local 1s countdown so the display updates every second without waiting for
    // the next subscription push.
    const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
    const countdownInitRef = useRef<string | null>(null); // tracks what we last initialised from

    // Derive the authoritative remaining seconds from the active order.
    const authEtaSeconds = (() => {
        if (customerVisibleStatus === 'PREPARING') {
            if (activeOrder?.estimatedReadyAt) {
                const ms = new Date(activeOrder.estimatedReadyAt).getTime() - Date.now();
                if (!Number.isNaN(ms)) return Math.max(0, ms / 1000);
            }
            const prepTotal = Number(activeOrder?.preparationMinutes ?? 0);
            if (!Number.isFinite(prepTotal) || prepTotal <= 0) return null;
            const startRaw = activeOrder?.preparingAt || activeOrder?.orderDate;
            const startMs = startRaw ? new Date(startRaw).getTime() : 0;
            if (!startMs || Number.isNaN(startMs)) return prepTotal * 60;
            return Math.max(0, prepTotal * 60 - (Date.now() - startMs) / 1000);
        }
        if (customerVisibleStatus === 'OUT_FOR_DELIVERY') {
            const secs = activeOrder?.driver?.driverConnection?.remainingEtaSeconds;
            const updatedAt = activeOrder?.driver?.driverConnection?.etaUpdatedAt;
            if (typeof secs !== 'number' || !Number.isFinite(secs) || !updatedAt) return null;
            const age = (Date.now() - new Date(updatedAt).getTime()) / 1000;
            if (age > 20) return null; // stale
            return Math.max(0, secs - age); // age-adjust so countdown starts accurate
        }
        return null;
    })();

    // Reset the local countdown whenever authoritative data meaningfully changes.
    const initKey = customerVisibleStatus === 'PREPARING'
        ? `${activeOrder?.estimatedReadyAt ?? ''}|${activeOrder?.preparingAt ?? ''}|${activeOrder?.preparationMinutes ?? ''}`
        : `${activeOrder?.driver?.driverConnection?.etaUpdatedAt ?? ''}`;

    useEffect(() => {
        if (authEtaSeconds === null) {
            setCountdownSeconds(null);
            countdownInitRef.current = null;
            return;
        }
        // Re-initialise whenever the source data key changed or we had no value.
        if (countdownInitRef.current !== initKey || countdownSeconds === null) {
            countdownInitRef.current = initKey;
            setCountdownSeconds(Math.round(authEtaSeconds));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initKey, authEtaSeconds === null]);

    // Tick down every second while a countdown is active.
    useEffect(() => {
        if (countdownSeconds === null) return;
        if (countdownSeconds <= 0) return;
        const id = setInterval(() => {
            setCountdownSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
        }, 1000);
        return () => clearInterval(id);
    }, [countdownSeconds === null, countdownSeconds === 0]);

    const etaMinutes = countdownSeconds !== null ? Math.max(1, Math.ceil(countdownSeconds / 60)) : null;
    const etaLabel = customerVisibleStatus === 'PREPARING' ? t.orders.details.est_ready : customerVisibleStatus === 'OUT_FOR_DELIVERY' ? t.orders.details.est_delivery : '';

    // Get business names
    const orderBusinesses = Array.isArray(activeOrder?.businesses) ? activeOrder.businesses : [];
    const businessNames = orderBusinesses
        .map((b) => (typeof b?.business?.name === 'string' ? b.business.name : ''))
        .filter(Boolean)
        .join(', ');
    const displayBusinessName = businessNames
        ? businessNames.length > 30
            ? businessNames.substring(0, 30) + '...'
            : businessNames
        : t.orders.active_bar;

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
    const activeOrderTitle = t.orders.active_bar;
    const activeOrderSubtitle = displayBusinessName;
    const activeOrderHint = statusInfo.message;

    // Auto-open is handled in AwaitingApprovalModalContainer — not here.

    // Slide-up entrance animation — only plays on the very first mount.
    // Subsequent mounts (e.g. brief route flickers) snap instantly to avoid
    // the banner appearing to vanish for 220 ms.
    const translateY = useSharedValue(_entranceAnimationPlayed ? 0 : 80);
    const opacity = useSharedValue(_entranceAnimationPlayed ? 1 : 0);
    const hasAnimatedRef = useRef(_entranceAnimationPlayed);
    useEffect(() => {
        if (hasAnimatedRef.current) {
            translateY.value = 0;
            opacity.value = 1;
            return;
        }
        hasAnimatedRef.current = true;
        _entranceAnimationPlayed = true;
        translateY.value = withSpring(0, { damping: 22, stiffness: 160 });
        opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    }, []);
    const slideStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    const pressInFlightRef = useRef(false);

    // Defensive: never render if the lead active order has a terminal status
    // (e.g. stale cache data briefly slipping through before subscription cleans it up).
    const isTerminalStatus = activeOrder?.status === 'DELIVERED' || activeOrder?.status === 'CANCELLED';
    if (!hasActiveOrders || activeOrders.length === 0 || !activeOrder || isTerminalStatus) {
        return null;
    }

    const handlePress = async () => {
        if (pressInFlightRef.current) return;
        pressInFlightRef.current = true;
        setTimeout(() => { pressInFlightRef.current = false; }, 800);

        if (!activeOrderId) {
            toast.warning(t.common.error, t.orders.banner_unavailable);
            return;
        }

        if (isAwaitingApproval) {
            // Open on the next frame so the press gesture can fully settle.
            // This avoids TouchableOpacity getting visually stuck in a pressed
            // (dimmed) state when a native Modal appears mid-gesture.
            requestAnimationFrame(() => {
                openModal(activeOrderId);
            });
            return;
        }

        router.push({
            pathname: '/orders/[orderId]',
            params: { orderId: activeOrderId },
        } as never);
    };

    return (
        <AnimatedTouchable
                activeOpacity={1}
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
    );
};
