import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useLiveActivity } from '@/hooks/useLiveActivity';

const LIVE_ACTIVITY_ELIGIBLE_STATUSES = new Set(['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

type LiveStatus = 'pending' | 'preparing' | 'out_for_delivery';

interface DeliveryLiveActivitiesCleanupModule {
    endAllActivities?: () => Promise<void>;
}

const deliveryLiveActivitiesCleanupNative =
    (NativeModules as Record<string, unknown>).DeliveryLiveActivities as
        | DeliveryLiveActivitiesCleanupModule
        | undefined;

function toMs(dateLike?: string | null): number | null {
    if (!dateLike) return null;
    const parsed = Date.parse(dateLike);
    if (Number.isNaN(parsed)) return null;
    return parsed;
}

export function useBackgroundLiveActivity() {
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders as any[]);

    const candidateOrder = useMemo(() => {
        const eligible = activeOrders.filter(
            (order) =>
                order &&
                order.id &&
                typeof order.status === 'string' &&
                LIVE_ACTIVITY_ELIGIBLE_STATUSES.has(order.status),
        );

        if (eligible.length === 0) return null;

        return [...eligible].sort((a, b) => {
            const aTime = Date.parse(a.updatedAt || a.orderDate || '') || 0;
            const bTime = Date.parse(b.updatedAt || b.orderDate || '') || 0;
            return bTime - aTime;
        })[0];
    }, [activeOrders]);

    const mappedStatus: LiveStatus | null = useMemo(() => {
        if (!candidateOrder?.status) return null;
        if (candidateOrder.status === 'OUT_FOR_DELIVERY') return 'out_for_delivery';
        if (candidateOrder.status === 'PENDING') return 'pending';
        if (candidateOrder.status === 'PREPARING' || candidateOrder.status === 'READY') return 'preparing';
        return null;
    }, [candidateOrder?.status]);

    const businessName =
        candidateOrder?.businesses?.[0]?.business?.name ||
        candidateOrder?.businesses?.find((entry: any) => entry?.business?.name)?.business?.name ||
        'Your order';

    const { startLiveActivity } = useLiveActivity({
        orderId: candidateOrder?.id || '',
        orderDisplayId: candidateOrder?.displayId || '',
        businessName,
        enabled: Boolean(candidateOrder?.id && mappedStatus),
    });

    const buildState = useCallback(() => {
        if (!candidateOrder || !mappedStatus) return null;

        const nowMs = Date.now();

        const prepTotal = Math.max(1, Number(candidateOrder.preparationMinutes || 15));
        const estimatedReadyAtMs = toMs(candidateOrder.estimatedReadyAt);

        const preparingStartedAtMs = toMs(candidateOrder.preparingAt);
        const pendingStartedAtMs = toMs(candidateOrder.orderDate);
        const outForDeliveryStartedAtMs = toMs(candidateOrder.updatedAt);

        const inferredPrepRemaining = estimatedReadyAtMs
            ? Math.max(0, Math.ceil((estimatedReadyAtMs - nowMs) / 60000))
            : prepTotal;

        if (mappedStatus === 'pending') {
            return {
                driverName: 'Your driver',
                estimatedMinutes: inferredPrepRemaining,
                phaseInitialMinutes: prepTotal,
                phaseStartedAt: pendingStartedAtMs ?? nowMs,
                status: mappedStatus,
            };
        }

        if (mappedStatus === 'preparing') {
            return {
                driverName: 'Your driver',
                estimatedMinutes: inferredPrepRemaining,
                phaseInitialMinutes: prepTotal,
                phaseStartedAt: preparingStartedAtMs ?? nowMs,
                status: mappedStatus,
            };
        }

        return {
            driverName: 'Your driver',
            estimatedMinutes: 15,
            phaseInitialMinutes: 15,
            phaseStartedAt: outForDeliveryStartedAtMs ?? nowMs,
            status: mappedStatus,
        };
    }, [candidateOrder, mappedStatus]);

    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const clearedWhenNoActiveOrderRef = useRef(false);

    useEffect(() => {
        const runStart = async () => {
            const state = buildState();
            if (!state) return;
            await startLiveActivity(state);
        };

        const subscription = AppState.addEventListener('change', (nextState) => {
            const previous = appStateRef.current;
            appStateRef.current = nextState;

            const movedToBackground =
                previous === 'active' && (nextState === 'background' || nextState === 'inactive');

            if (movedToBackground) {
                void runStart();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [buildState, startLiveActivity]);

    useEffect(() => {
        if (Platform.OS !== 'ios') {
            return;
        }

        if (candidateOrder?.id) {
            clearedWhenNoActiveOrderRef.current = false;
            return;
        }

        if (clearedWhenNoActiveOrderRef.current) {
            return;
        }

        clearedWhenNoActiveOrderRef.current = true;
        if (deliveryLiveActivitiesCleanupNative?.endAllActivities) {
            void deliveryLiveActivitiesCleanupNative.endAllActivities().catch(() => {
                clearedWhenNoActiveOrderRef.current = false;
            });
        }
    }, [candidateOrder?.id]);

    useEffect(() => {
        const isForeground = appStateRef.current === 'active';
        if (!isForeground) {
            const state = buildState();
            if (state) {
                void startLiveActivity(state);
            }
        }
    }, [buildState, startLiveActivity]);
}
