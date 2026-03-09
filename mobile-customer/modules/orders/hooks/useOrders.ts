import { OrderStatus } from '@/gql/graphql';
import {
    CANCEL_ORDER,
    GET_ORDER,
    GET_ORDERS,
    GET_ORDERS_BY_STATUS,
    UPDATE_ORDER_STATUS,
} from '@/graphql/operations/orders';
import { useMutation, useQuery } from '@apollo/client/react';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export function useOrders() {
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);
    const userId = useAuthStore((state) => state.user?.id);
    
    // Initial query to load data - use network-only to always fetch fresh data and avoid stale cache
    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'network-only', // Don't fall back to cache-first
    });

    // Update store when query data changes (subscription updates are handled by useOrdersSubscription)
    useEffect(() => {
        if (data?.orders && userId) {
            const activeOrders = (data.orders as any[]).filter(
                (order) => 
                    order.userId === userId && 
                    order.status !== 'DELIVERED' && 
                    order.status !== 'CANCELLED'
            );
            setActiveOrders(activeOrders as unknown as any);
        }
    }, [data, userId, setActiveOrders]);

    return {
        orders: (data as any)?.orders || [],
        loading,
        error,
        refetch,
    };
}

export function useOrder(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_ORDER, {
        variables: { id },
        skip: !id,
        fetchPolicy: 'network-only', // Always fetch fresh data for individual orders
        nextFetchPolicy: 'cache-first', // But allow cache for subsequent reads on same screen
    });

    return {
        order: data?.order || null,
        loading,
        error,
        refetch,
    };
}

export function useOrdersByStatus(status: OrderStatus) {
    const { data, loading, error, refetch } = useQuery(GET_ORDERS_BY_STATUS, {
        variables: { status },
        skip: !status,
    });

    return {
        orders: data?.ordersByStatus || [],
        loading,
        error,
        refetch,
    };
}

export function useUpdateOrderStatus() {
    const [updateOrderStatus, { loading, error }] = useMutation(UPDATE_ORDER_STATUS);
    const removeOrder = useActiveOrdersStore((state) => state.removeOrder);

    const update = async (id: string, status: OrderStatus) => {
        try {
            const result = await updateOrderStatus({
                variables: { id, status },
                refetchQueries: [{ query: GET_ORDERS }, { query: GET_ORDERS_BY_STATUS, variables: { status } }],
                awaitRefetchQueries: true, // Wait for refetch before resolving
                update: (cache, { data }) => {
                    // If order is now completed, evict it from cache
                    if (data?.updateOrderStatus?.status === 'DELIVERED' || data?.updateOrderStatus?.status === 'CANCELLED') {
                        cache.evict({ id: cache.identify({ __typename: 'Order', id }) });
                        cache.gc(); // Garbage collect orphaned references
                        removeOrder(id); // Remove from Zustand store
                    }
                },
            });
            return {
                data: result.data?.updateOrderStatus || null,
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err,
            };
        }
    };

    return {
        update,
        loading,
        error,
    };
}

export function useCancelOrder() {
    const [cancelOrder, { loading, error }] = useMutation(CANCEL_ORDER);
    const removeOrder = useActiveOrdersStore((state) => state.removeOrder);

    const cancel = async (id: string) => {
        try {
            const result = await cancelOrder({
                variables: { id },
                refetchQueries: [
                    { query: GET_ORDERS },
                    { query: GET_ORDERS_BY_STATUS, variables: { status: 'CANCELLED' } },
                ],
                awaitRefetchQueries: true, // Wait for refetch before resolving
                update: (cache) => {
                    // Immediately evict cancelled order from cache
                    cache.evict({ id: cache.identify({ __typename: 'Order', id }) });
                    cache.gc(); // Garbage collect orphaned references
                    removeOrder(id); // Remove from Zustand store
                },
            });
            return {
                data: result.data?.cancelOrder || null,
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err,
            };
        }
    };

    return {
        cancel,
        loading,
        error,
    };
}
