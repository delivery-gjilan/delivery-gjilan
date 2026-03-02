import { useSubscription } from '@apollo/client/react';
import { GET_ORDERS, GET_ORDER } from '@/graphql/operations/orders';
import { USER_ORDERS_UPDATED } from '@/graphql/operations/orders/subscriptions';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useAuthStore } from '@/store/authStore';

/**
 * Single authoritative subscription for order updates.
 * Writes the latest orders into the Apollo cache (which updates all active
 * useQuery(GET_ORDERS) watchers) AND updates the Zustand active-orders store.
 * Skips when there are no active orders to avoid unnecessary WebSocket traffic.
 */
export function useOrdersSubscription() {
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasActiveOrders = useActiveOrdersStore((state) => state.hasActiveOrders);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);

    const shouldSubscribe = !!token && isAuthenticated;

    const { loading, error } = useSubscription(USER_ORDERS_UPDATED, {
        variables: { input: { token: token || '' } },
        skip: !shouldSubscribe,
        onData: ({ client }) => {
            // Signal received — refetch orders from server
            client.refetchQueries({ include: [GET_ORDERS, GET_ORDER] }).then((results) => {
                const orders = (results[0]?.data as any)?.orders ?? [];
                const activeOrders = orders.filter(
                    (order: any) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
                );
                setActiveOrders(activeOrders as unknown as any);
            });
        },
        onError: (err) => {
            console.error('[OrdersSubscription] error:', err);
        },
    });

    return {
        subscriptionActive: shouldSubscribe && !loading,
        error,
    };
}
