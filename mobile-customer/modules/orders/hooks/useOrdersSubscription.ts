import { useApolloClient, useSubscription } from '@apollo/client/react';
import { useEffect, useRef } from 'react';
import { GET_ORDERS, GET_ORDER } from '@/graphql/operations/orders';
import { USER_ORDERS_UPDATED } from '@/graphql/operations/orders/subscriptions';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useAuthStore } from '@/store/authStore';
import { addWsReconnectListener } from '@/lib/graphql/apolloClient';

/**
 * Single authoritative subscription for order updates.
 * Writes the latest orders into the Apollo cache (which updates all active
 * useQuery(GET_ORDERS) watchers) AND updates the Zustand active-orders store.
 * Subscribes whenever a user is authenticated to avoid stale local state gaps.
 */
export function useOrdersSubscription() {
    const apolloClient = useApolloClient();
    const userId = useAuthStore((state) => state.user?.id);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);
    const updateOrder = useActiveOrdersStore((state) => state.updateOrder);
    const removeOrder = useActiveOrdersStore((state) => state.removeOrder);
    const refetchInFlightRef = useRef(false);
    const refetchCooldownRef = useRef(0);

    // Always subscribe while authenticated so we can recover from temporary empty
    // local state right after order creation/status transitions.
    const shouldSubscribe = isAuthenticated && Boolean(userId);

    const isActiveStatus = (status?: string | null) => status !== 'DELIVERED' && status !== 'CANCELLED';

    const isActiveOrderForUser = (order: any) =>
        Boolean(userId) &&
        String(order?.userId) === String(userId) &&
        typeof order?.status === 'string' &&
        isActiveStatus(order.status);

    const runRefetch = async (client: any) => {
        if (!userId) return;
        const { data } = await client.query({
            query: GET_ORDERS,
            fetchPolicy: 'network-only',
        });
        const orders = (data as any)?.orders ?? [];
        const activeOrders = orders.filter(
            (order: any) =>
                order.userId === userId &&
                order.status !== 'DELIVERED' &&
                order.status !== 'CANCELLED',
        );
        setActiveOrders(activeOrders as unknown as any);
    };

    const scheduleFallbackRefetch = (client: any, force = false) => {
        if (!userId) return;
        if (refetchInFlightRef.current) return;

        const now = Date.now();
        if (!force && now - refetchCooldownRef.current < 1000) {
            return;
        }

        refetchInFlightRef.current = true;
        refetchCooldownRef.current = now;
        void runRefetch(client).finally(() => {
            refetchInFlightRef.current = false;
        });
    };

    const applyRealtimeOrderUpdate = (client: any, nextOrder: any) => {
        if (!nextOrder?.id) {
            return false;
        }

        client.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
            const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
            const existingIndex = currentOrders.findIndex(
                (order: any) => String(order?.id) === String(nextOrder.id),
            );

            let updatedOrders = currentOrders;
            if (existingIndex >= 0) {
                updatedOrders = [...currentOrders];
                updatedOrders[existingIndex] = nextOrder;
            } else {
                updatedOrders = [nextOrder, ...currentOrders];
            }

            return {
                ...(existing ?? {}),
                orders: updatedOrders,
            };
        });

        client.cache.writeQuery({
            query: GET_ORDER,
            variables: { id: String(nextOrder.id) },
            data: { order: nextOrder },
        });

        if (isActiveOrderForUser(nextOrder)) {
            updateOrder(nextOrder as unknown as any);
        } else if (String(nextOrder?.userId) === String(userId)) {
            removeOrder(String(nextOrder.id));
        }

        return true;
    };

    const applyRealtimeOrdersSnapshot = (client: any, nextOrders: any[]) => {
        if (!Array.isArray(nextOrders) || nextOrders.length === 0) {
            return false;
        }

        client.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
            const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
            const byId = new Map(currentOrders.map((o: any) => [String(o?.id), o]));
            nextOrders.forEach((o: any) => {
                if (o?.id) byId.set(String(o.id), o);
            });
            return {
                ...(existing ?? {}),
                orders: Array.from(byId.values()),
            };
        });

        nextOrders.forEach((order) => {
            if (!order?.id) {
                return;
            }
            client.cache.writeQuery({
                query: GET_ORDER,
                variables: { id: String(order.id) },
                data: { order },
            });

            if (isActiveOrderForUser(order)) {
                updateOrder(order as unknown as any);
            } else if (String(order?.userId) === String(userId)) {
                removeOrder(String(order.id));
            }
        });

        return true;
    };

    const { loading, error } = useSubscription(USER_ORDERS_UPDATED, {
        skip: !shouldSubscribe,
        onData: ({ client, data }) => {
            const payload = (data?.data as any)?.userOrdersUpdated;

            try {
                const didApply = Array.isArray(payload)
                    ? applyRealtimeOrdersSnapshot(client, payload)
                    : applyRealtimeOrderUpdate(client, payload);
                if (!didApply) {
                    scheduleFallbackRefetch(client);
                }
            } catch (err) {
                console.warn('[OrdersSubscription] payload apply failed, using fallback refetch', err);
                scheduleFallbackRefetch(client);
            }
        },
        onError: (err) => {
            console.error('[OrdersSubscription] error:', err);
        },
    });

    useEffect(() => {
        if (!shouldSubscribe) {
            return;
        }

        return addWsReconnectListener(() => {
            scheduleFallbackRefetch(apolloClient, true);
        });
    }, [apolloClient, shouldSubscribe, userId]);

    return {
        subscriptionActive: shouldSubscribe && !loading,
        error,
    };
}
