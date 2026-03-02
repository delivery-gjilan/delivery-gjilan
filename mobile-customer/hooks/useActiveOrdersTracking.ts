import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useOrders } from '../modules/orders/hooks/useOrders';
import { useOrdersSubscription } from '../modules/orders/hooks/useOrdersSubscription';

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

    // Fetch orders and subscribe to updates (this updates the store automatically)
    const { loading, error, refetch } = useOrders();

    // Subscribe to real-time order updates
    useOrdersSubscription();

    // Refetch orders when user becomes authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refetch();
        }
    }, [isAuthenticated, refetch]);

    return {
        loading,
        error,
        refetch,
    };
}
