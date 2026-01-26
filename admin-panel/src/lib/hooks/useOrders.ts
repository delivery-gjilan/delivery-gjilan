'use client';

import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import {
    GET_ORDERS,
    GET_ORDER,
    GET_ORDERS_BY_STATUS,
    UPDATE_ORDER_STATUS,
    CANCEL_ORDER,
} from '@/graphql/operations/orders';
import { ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/orders/subscriptions';

export interface UseOrdersResult {
    orders: any[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseOrderResult {
    order: any | null;
    loading: boolean;
    error?: string;
}

export interface UseOrdersByStatusResult {
    orders: any[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseUpdateOrderStatusResult {
    update: (id: string, status: string) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseCancelOrderResult {
    cancel: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export function useOrders(): UseOrdersResult {
    // Initial query to load data - use network-only to avoid stale cache
    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'network-only', // Changed from 'cache-and-network' to always fetch fresh data
    });

    // Real-time subscription for updates - automatically updates cache
    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ client, data: subData }) => {
            if (subData?.data?.allOrdersUpdated) {
                // Update the cache with new orders data
                client.writeQuery({
                    query: GET_ORDERS,
                    data: {
                        orders: subData.data.allOrdersUpdated,
                    },
                });
            }
        },
    });

    return {
        orders: (data as any)?.orders || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useOrder(id: string): UseOrderResult {
    const { data, loading, error } = useQuery(GET_ORDER, {
        variables: { id },
        skip: !id,
    });

    return {
        order: (data as any)?.order || null,
        loading,
        error: error?.message,
    };
}

export function useOrdersByStatus(status: string): UseOrdersByStatusResult {
    const { data, loading, error, refetch } = useQuery(GET_ORDERS_BY_STATUS, {
        variables: { status },
        skip: !status,
    });

    return {
        orders: (data as any)?.ordersByStatus || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useUpdateOrderStatus(): UseUpdateOrderStatusResult {
    const [mutate, { loading, error }] = useMutation(UPDATE_ORDER_STATUS);

    return {
        update: async (id, status) => {
            try {
                const result = await mutate({ variables: { id, status } });
                return { success: true, data: result.data };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}

export function useCancelOrder(): UseCancelOrderResult {
    const [mutate, { loading, error }] = useMutation(CANCEL_ORDER);

    return {
        cancel: async (id) => {
            try {
                await mutate({ variables: { id } });
                return { success: true };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}
