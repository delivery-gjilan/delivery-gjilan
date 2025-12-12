import { OrderStatus } from '@/gql/graphql';
import {
    CANCEL_ORDER,
    GET_ORDER,
    GET_ORDERS,
    GET_ORDERS_BY_STATUS,
    UPDATE_ORDER_STATUS,
} from '@/graphql/operations/orders';
import { useMutation, useQuery } from '@apollo/client/react';

export function useOrders() {
    const { data, loading, error, refetch } = useQuery(GET_ORDERS);

    return {
        orders: data?.orders || [],
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
