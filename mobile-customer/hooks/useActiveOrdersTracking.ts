import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUncompletedOrders } from '../modules/orders/hooks/useUncompletedOrders';
import { useOrdersSubscription } from '../modules/orders/hooks/useOrdersSubscription';

/**
 * Hook to manage active orders tracking
 * This should be called at the app root level when the user is authenticated
 *
 * Flow:
 * 1. When user logs in, fetch uncompleted orders
 * 2. Update the Zustand store with the orders
 * 3. If there are active orders, start the subscription
 * 4. Subscription updates the store in real-time
 * 5. When all orders are completed, subscription automatically stops
 */
export function useActiveOrdersTracking() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Fetch uncompleted orders (this updates the store)
    const { loading, error, refetch } = useUncompletedOrders();

    // Subscribe to order updates (only active when there are active orders)
    const { subscriptionActive, error: subscriptionError } = useOrdersSubscription();

    // Refetch orders when user becomes authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refetch();
        }
    }, [isAuthenticated, refetch]);

    return {
        loading,
        error: error || subscriptionError,
        subscriptionActive,
        refetch,
    };
}
