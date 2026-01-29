import { OrderStatus } from '@/gql/graphql';
import {
    CANCEL_ORDER,
    GET_ORDER,
    GET_ORDERS,
    GET_ORDERS_BY_STATUS,
    UPDATE_ORDER_STATUS,
} from '@/graphql/operations/orders';
import { USER_ORDERS_UPDATED } from '@/graphql/operations/orders/subscriptions';
import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useEffect } from 'react';

export function useOrders() {
    const token = useAuthStore((state) => state.token);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);
    
    // Initial query to load data
    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
    });

    // Real-time subscription for updates - automatically updates cache AND store
    useSubscription(USER_ORDERS_UPDATED, {
        variables: { input: { token: token || '' } },
        skip: !token,
        onData: ({ client, data: subData }) => {
            if (subData?.data?.userOrdersUpdated) {
                const orders = subData.data.userOrdersUpdated;
                console.log('[useOrders] Subscription received orders:', orders.length);
                
                // Update Apollo cache
                client.writeQuery({
                    query: GET_ORDERS,
                    data: { orders },
                });

                // Update Zustand store with active orders
                const activeOrders = orders.filter(
                    (order: any) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
                );
                console.log('[useOrders] Filtered active orders:', activeOrders.length);
                setActiveOrders(activeOrders);
            }
        },
    });

    // Update store when data changes
    useEffect(() => {
        if (data?.orders) {
            const activeOrders = (data.orders as any[]).filter(
                (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
            );
            console.log('[useOrders] Query data - Total orders:', data.orders.length, 'Active:', activeOrders.length);
            setActiveOrders(activeOrders);
        }
    }, [data, setActiveOrders]);

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

    const update = async (id: string, status: OrderStatus) => {
        try {
            const result = await updateOrderStatus({
                variables: { id, status },
                refetchQueries: [{ query: GET_ORDERS }, { query: GET_ORDERS_BY_STATUS, variables: { status } }],
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

    const cancel = async (id: string) => {
        try {
            const result = await cancelOrder({
                variables: { id },
                refetchQueries: [
                    { query: GET_ORDERS },
                    { query: GET_ORDERS_BY_STATUS, variables: { status: 'CANCELLED' } },
                ],
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
