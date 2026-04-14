import { useSubscription } from '@apollo/client/react';
import { ORDER_DRIVER_LIVE_TRACKING } from '@/graphql/operations/orders/subscriptions';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { OrderStatus } from '@/gql/graphql';

/**
 * Mounts an `orderDriverLiveTracking` subscription for the first active order
 * that is currently OUT_FOR_DELIVERY. Patches driverConnection in Zustand so
 * the floating banner always shows a live delivery ETA, even when OrderDetails
 * is not open.
 *
 * This must be called at the app root level (alongside useActiveOrdersTracking).
 */
export function useGlobalDriverTracking() {
    const patchDriverConnection = useActiveOrdersStore((s) => s.patchDriverConnection);

    // Narrow selector: only recomputes when the delivery order ID actually changes.
    // Using s.activeOrders directly would re-render AppContent on every patchDriverConnection
    // call (~every 5 s), causing the entire app tree to re-render unnecessarily.
    const deliveryOrderId = useActiveOrdersStore((s) => {
        const order = s.activeOrders.find((o) => o?.status === OrderStatus.OutForDelivery);
        return order?.id ? String(order.id) : null;
    });

    useSubscription(ORDER_DRIVER_LIVE_TRACKING, {
        variables: { orderId: deliveryOrderId ?? '' },
        skip: !deliveryOrderId,
        onData: ({ data }) => {
            const payload = data.data?.orderDriverLiveTracking;
            if (!payload || !deliveryOrderId) return;
            patchDriverConnection(deliveryOrderId, {
                activeOrderId: payload.orderId,
                navigationPhase: payload.navigationPhase ?? null,
                remainingEtaSeconds: payload.remainingEtaSeconds ?? null,
                etaUpdatedAt: payload.etaUpdatedAt,
            });
        },
    });
}
