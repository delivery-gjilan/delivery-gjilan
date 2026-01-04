import { useSubscription } from '@apollo/client/react';
import { USER_ORDERS_UPDATED } from '@/graphql/operations/orders';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to subscribe to order updates
 * This should only be active when there are active orders
 */
export function useOrdersSubscription() {
    const token = useAuthStore((state) => state.token);
    const hasActiveOrders = useActiveOrdersStore((state) => state.hasActiveOrders);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);

    // Track if subscription should be active
    const shouldSubscribe = !!token && hasActiveOrders;

    const { data, loading, error } = useSubscription(USER_ORDERS_UPDATED, {
        variables: {
            input: {
                token: token || '',
            },
        },
        skip: !shouldSubscribe,
        onError: (err) => {
            console.error('Orders subscription error:', err);
        },
    });

    // Update the store whenever subscription data changes
    useEffect(() => {
        if (data?.userOrdersUpdated) {
            // Update each order in the store
            setActiveOrders(data.userOrdersUpdated);
        }
    }, [data, setActiveOrders]);

    return {
        subscriptionActive: shouldSubscribe && !loading,
        error,
    };
}
