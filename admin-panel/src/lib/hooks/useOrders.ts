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

export interface UseOrdersResult {
    orders: any[];
    totalCount: number;
    hasMore: boolean;
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

export interface UseOrdersOptions {
    limit?: number;
    offset?: number;
    statuses?: string[];
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
    const { limit = 100, offset = 0, statuses } = options;
    const apolloClient = useApolloClient();
    const variables: any = { limit, offset };
    if (statuses) variables.statuses = statuses;

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

    const connection = (data as any)?.orders;
    const ordersList = Array.isArray(connection?.orders) ? connection.orders : [];
    const totalCount: number = connection?.totalCount ?? 0;
    const hasMore: boolean = connection?.hasMore ?? false;

    useEffect(() => {
        if (ordersList.length === 0) return;

        ordersList.forEach((order: any) => {
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
            const incomingOrders = (subscriptionData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            const validIncomingOrders = incomingOrders.filter((order: any) =>
                order && typeof order === 'object' && order.id,
            );

            if (validIncomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            const newActiveOrders = validIncomingOrders.filter((order: any) => {
                const isKnown = knownOrderIdsRef.current.has(String(order.id));
                if (isKnown) return false;
                return order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
            });

            const shouldAlert = hasInitializedKnownIdsRef.current && newActiveOrders.length > 0;

            validIncomingOrders.forEach((order: any) => {
                knownOrderIdsRef.current.add(String(order.id));
            });

            if (!hasInitializedKnownIdsRef.current) {
                hasInitializedKnownIdsRef.current = true;
            }

            if (shouldAlert) {
                void playNewOrderAlert();
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS, variables }, (existing: any) => {
                const currentConnection = existing?.orders;
                const currentOrders = Array.isArray(currentConnection?.orders) ? currentConnection.orders : [];
                const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));

                validIncomingOrders.forEach((order: any) => {
                    const existingOrder = byId.get(String(order?.id));
                    byId.set(String(order?.id), existingOrder ? { ...existingOrder, ...order } : order);
                });

                return {
                    ...(existing ?? {}),
                    orders: {
                        ...(currentConnection ?? {}),
                        orders: Array.from(byId.values()),
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
        order: (data as any)?.order || null,
        loading,
        error: error?.message,
    };
}

export function useOrdersByStatus(status: string): UseOrdersByStatusResult {
    const { data, loading, error, refetch } = useQuery(GET_ORDERS_BY_STATUS, {
        variables: { status: status as any },
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
                const result = await mutate({ variables: { id, status: status as any } });
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
