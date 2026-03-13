import { useSubscription } from '@apollo/client/react';
import { useEffect, useRef } from 'react';
import { GET_ORDERS, GET_ORDER } from '@/graphql/operations/orders';
import { USER_ORDERS_UPDATED } from '@/graphql/operations/orders/subscriptions';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useAuthStore } from '@/store/authStore';

/**
 * Single authoritative subscription for order updates.
 * Writes the latest orders into the Apollo cache (which updates all active
 * useQuery(GET_ORDERS) watchers) AND updates the Zustand active-orders store.
 * Subscribes whenever a user is authenticated to avoid stale local state gaps.
 */
export function useOrdersSubscription() {
    const userId = useAuthStore((state) => state.user?.id);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);
    const refetchInFlightRef = useRef(false);
    const refetchCooldownRef = useRef(0);
    const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Always subscribe while authenticated so we can recover from temporary empty
    // local state right after order creation/status transitions.
    const shouldSubscribe = isAuthenticated && Boolean(userId);

    useEffect(() => {
        return () => {
            if (pendingTimerRef.current) {
                clearTimeout(pendingTimerRef.current);
                pendingTimerRef.current = null;
            }
        };
    }, []);

    const { loading, error } = useSubscription(USER_ORDERS_UPDATED, {
        skip: !shouldSubscribe,
        onData: ({ client }) => {
            const now = Date.now();
            const canRunNow = now - refetchCooldownRef.current >= 1000 && !refetchInFlightRef.current;

            if (!canRunNow) {
                if (pendingTimerRef.current) {
                    return;
                }
                pendingTimerRef.current = setTimeout(() => {
                    pendingTimerRef.current = null;
                    if (refetchInFlightRef.current) {
                        return;
                    }
                    refetchInFlightRef.current = true;
                    refetchCooldownRef.current = Date.now();
                    client.refetchQueries({ include: [GET_ORDERS, GET_ORDER] }).then((results) => {
                        const orders = (results[0]?.data as any)?.orders ?? [];
                        const activeOrders = orders.filter(
                            (order: any) =>
                                order.userId === userId &&
                                order.status !== 'DELIVERED' &&
                                order.status !== 'CANCELLED',
                        );
                        setActiveOrders(activeOrders as unknown as any);
                    }).finally(() => {
                        refetchInFlightRef.current = false;
                    });
                }, 350);
                return;
            }

            refetchInFlightRef.current = true;
            refetchCooldownRef.current = now;
            client.refetchQueries({ include: [GET_ORDERS, GET_ORDER] }).then((results) => {
                const orders = (results[0]?.data as any)?.orders ?? [];
                const activeOrders = orders.filter(
                    (order: any) => 
                        order.userId === userId && 
                        order.status !== 'DELIVERED' && 
                        order.status !== 'CANCELLED',
                );
                setActiveOrders(activeOrders as unknown as any);
            }).finally(() => {
                refetchInFlightRef.current = false;
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
