import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useOrders } from '../modules/orders/hooks/useOrders';
import { useOrdersSubscription } from '../modules/orders/hooks/useOrdersSubscription';
import { useOrderReviewPromptStore } from '@/store/useOrderReviewPromptStore';
import { useGlobalDriverTracking } from './useGlobalDriverTracking';

/**
 * Hook to manage active orders tracking using real-time subscriptions
 * This should be called at the app root level when the user is authenticated
 *
 * Flow:
 * 1. When user logs in, fetch orders
 * 2. Update the Zustand store with active orders
 * 3. Real-time subscription automatically updates the store
 */
export function useActiveOrdersTracking() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const userId = useAuthStore((state) => state.user?.id);
    const requestReviewPrompt = useOrderReviewPromptStore((state) => state.requestPrompt);
    const previousStatusesRef = useRef<Record<string, string>>({});

    // Fetch orders and subscribe to updates (this updates the store automatically)
    const { orders, loading, error, refetch } = useOrders();

    // Subscribe to real-time order updates
    useOrdersSubscription();

    // Subscribe to live driver tracking for any OUT_FOR_DELIVERY order so the
    // floating banner shows live ETA even when OrderDetails is not open.
    useGlobalDriverTracking();

    // Refetch orders when user becomes authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refetch();
        }
    }, [isAuthenticated, refetch]);

    // Trigger post-delivery review prompt globally (dashboard/home included).
    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        const nextStatuses: Record<string, string> = {};
        const userOrders = (orders as any[]).filter((order) => order?.userId === userId);

        for (const order of userOrders) {
            if (!order?.id || !order?.status) continue;

            const prevStatus = previousStatusesRef.current[order.id];
            const nextStatus = order.status;
            nextStatuses[order.id] = nextStatus;

            if (prevStatus && prevStatus !== 'DELIVERED' && nextStatus === 'DELIVERED') {
                requestReviewPrompt(order.id);
            }
        }

        previousStatusesRef.current = nextStatuses;
    }, [isAuthenticated, userId, orders, requestReviewPrompt]);

    return {
        loading,
        error,
        refetch,
    };
}
