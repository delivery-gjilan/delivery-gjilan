'use client';

import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';
import {
    GET_ORDERS,
    GET_ORDER,
    GET_ORDERS_BY_STATUS,
    UPDATE_ORDER_STATUS,
    CANCEL_ORDER,
} from '@/graphql/operations/orders';
import { ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/orders/subscriptions';
import { playNewOrderAlert } from '@/lib/audio/orderAlert';
import { toast } from 'sonner';
import type {
    CancelOrderMutation,
    GetOrderQuery,
    GetOrdersByStatusQuery,
    GetOrdersQuery,
    GetOrdersQueryVariables,
    OrderStatus,
    UpdateOrderStatusMutation,
} from '@/gql/graphql';

type OrderList = GetOrdersQuery['orders']['orders'];
type OrderItem = OrderList[number];

export interface UseOrdersResult {
    orders: OrderList;
    totalCount: number;
    hasMore: boolean;
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseOrderResult {
    order: GetOrderQuery['order'];
    loading: boolean;
    error?: string;
}

export interface UseOrdersByStatusResult {
    orders: GetOrdersByStatusQuery['ordersByStatus'];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseUpdateOrderStatusResult {
    update: (id: string, status: string) => Promise<{
        success: boolean;
        data?: UpdateOrderStatusMutation;
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

export interface UseOrdersOptions {
    limit?: number;
    offset?: number;
    statuses?: string[];
    startDate?: string;
    endDate?: string;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
    const { limit = 100, offset = 0, statuses, startDate, endDate } = options;
    const apolloClient = useApolloClient();
    const variables: GetOrdersQueryVariables = {
        limit,
        offset,
        ...(statuses && { statuses: statuses as OrderStatus[] }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
    };

    // Initial query to load data - use network-only to avoid stale cache
    const { data, loading, error, refetch } = useQuery(GET_ORDERS, {
        variables,
        fetchPolicy: 'network-only',
    });

    const refetchCooldownRef = useRef(0);
    const refetchInFlightRef = useRef(false);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const hasInitializedKnownIdsRef = useRef(false);

    const connection = data?.orders;
    const ordersList: OrderList = Array.isArray(connection?.orders) ? connection.orders : [];
    const totalCount: number = connection?.totalCount ?? 0;
    const hasMore: boolean = connection?.hasMore ?? false;

    useEffect(() => {
        if (ordersList.length === 0) return;

        ordersList.forEach((order) => {
            if (order?.id) knownOrderIdsRef.current.add(String(order.id));
        });

        hasInitializedKnownIdsRef.current = true;
    }, [ordersList]);

    useEffect(() => {
        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current);
                refetchTimerRef.current = null;
            }
        };
    }, []);

    const scheduleRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - refetchCooldownRef.current >= 1200 && !refetchInFlightRef.current;

        if (!canRunNow) {
            if (refetchTimerRef.current) {
                return;
            }
            refetchTimerRef.current = setTimeout(() => {
                refetchTimerRef.current = null;
                if (refetchInFlightRef.current) {
                    return;
                }
                refetchInFlightRef.current = true;
                refetchCooldownRef.current = Date.now();
                refetch().finally(() => {
                    refetchInFlightRef.current = false;
                });
            }, 350);
            return;
        }

        refetchInFlightRef.current = true;
        refetchCooldownRef.current = now;
        refetch().finally(() => {
            refetchInFlightRef.current = false;
        });
    }, [refetch]);

    // Real-time subscription for updates — refetch on signal
    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            const validIncomingOrders = incomingOrders.filter((order) =>
                order && typeof order === 'object' && order.id,
            );

            if (validIncomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            const newActiveOrders = validIncomingOrders.filter((order) => {
                const isKnown = knownOrderIdsRef.current.has(String(order.id));
                if (isKnown) return false;
                return order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
            });

            const shouldAlert = hasInitializedKnownIdsRef.current && newActiveOrders.length > 0;

            validIncomingOrders.forEach((order) => {
                knownOrderIdsRef.current.add(String(order.id));
            });

            if (!hasInitializedKnownIdsRef.current) {
                hasInitializedKnownIdsRef.current = true;
            }

            if (shouldAlert) {
                void playNewOrderAlert();
                const inventoryOrders = newActiveOrders.filter((o) =>
                    o.inventoryPrice != null && Number(o.inventoryPrice) > 0
                );
                if (inventoryOrders.length > 0) {
                    toast('📦 Stock order incoming', {
                        description: `${inventoryOrders.length} order${inventoryOrders.length > 1 ? 's' : ''} use${inventoryOrders.length > 1 ? '' : 's'} your inventory — check Fulfillment Guide`,
                        duration: 8000,
                    });
                }
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS, variables }, (existing) => {
                const currentConnection = existing?.orders;
                const currentOrders = Array.isArray(currentConnection?.orders) ? currentConnection.orders : [];
                const byId = new Map(currentOrders.map((order) => [String(order?.id), order]));

                validIncomingOrders.forEach((order) => {
                    const existingOrder = byId.get(String(order?.id));
                    byId.set(String(order?.id), existingOrder ? { ...existingOrder, ...order } : order);
                });

                // Filter out orders that don't match the query's expected statuses
                const expectedStatuses = statuses ?? ['AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
                const filtered = Array.from(byId.values()).filter(
                    (order) => order?.status && expectedStatuses.includes(order.status),
                );

                return {
                    ...(existing ?? {}),
                    orders: {
                        ...(currentConnection ?? {}),
                        orders: filtered,
                    },
                };
            });
        },
    });

    return {
        orders: ordersList,
        totalCount,
        hasMore,
        loading,
        error: error?.message,
        refetch: () => refetch(variables),
    };
}

export function useOrder(id: string): UseOrderResult {
    const { data, loading, error } = useQuery(GET_ORDER, {
        variables: { id },
        skip: !id,
    });

    return {
        order: data?.order || null,
        loading,
        error: error?.message,
    };
}

export function useOrdersByStatus(status: string): UseOrdersByStatusResult {
    const { data, loading, error, refetch } = useQuery(GET_ORDERS_BY_STATUS, {
        variables: { status: status as OrderStatus },
        skip: !status,
    });

    return {
        orders: data?.ordersByStatus || [],
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
                const result = await mutate({ variables: { id, status: status as OrderStatus } });
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
