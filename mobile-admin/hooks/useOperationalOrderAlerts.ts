import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_SUBSCRIPTION } from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';

const LATE_PENDING_MINUTES = 15;

type OrdersQueryResult = {
    orders: {
        orders: Array<{
            id: string;
            displayId?: string | null;
            status: string;
            orderDate: string;
            businesses?: Array<{ business?: { name?: string } | null }> | null;
        }>;
    };
};

export function useOperationalOrderAlerts() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const initializedRef = useRef(false);
    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const latePendingNotifiedRef = useRef<Set<string>>(new Set());
    const ordersRef = useRef<any[]>([]);

    const { data } = useQuery<OrdersQueryResult>(GET_ORDERS, {
        variables: { limit: 200, offset: 0 },
        skip: !isAuthenticated,
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-and-network',
    });

    const notify = useCallback(async (title: string, body: string, orderId: string) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { orderId, appType: 'ADMIN' },
                    sound: 'default',
                },
                trigger: null,
            });
        } catch {
            // Best-effort local alert.
        }
    }, []);

    const evaluateLatePending = useCallback(
        async (orders: any[]) => {
            const now = Date.now();
            for (const order of orders) {
                const isPendingLike = order.status === 'PENDING' || order.status === 'AWAITING_APPROVAL';
                if (!isPendingLike) {
                    latePendingNotifiedRef.current.delete(order.id);
                    continue;
                }

                const startedAt = new Date(order.orderDate).getTime();
                if (!Number.isFinite(startedAt)) continue;

                const elapsedMin = (now - startedAt) / 60000;
                if (elapsedMin >= LATE_PENDING_MINUTES && !latePendingNotifiedRef.current.has(order.id)) {
                    latePendingNotifiedRef.current.add(order.id);
                    const ref = order.displayId || order.id.slice(-6);
                    await notify('Late pending order', `Order #${ref} has been pending for ${Math.floor(elapsedMin)} min.`, order.id);
                }
            }
        },
        [notify],
    );

    useEffect(() => {
        if (!isAuthenticated) {
            initializedRef.current = false;
            knownOrderIdsRef.current.clear();
            latePendingNotifiedRef.current.clear();
            ordersRef.current = [];
            return;
        }

        const orders = Array.isArray(data?.orders?.orders) ? data.orders.orders : [];
        ordersRef.current = orders;

        if (!initializedRef.current && orders.length > 0) {
            orders.forEach((order: any) => {
                knownOrderIdsRef.current.add(order.id);
            });
            initializedRef.current = true;
            void evaluateLatePending(orders);
            return;
        }

        if (initializedRef.current) {
            void evaluateLatePending(orders);
        }
    }, [data?.orders?.orders, evaluateLatePending, isAuthenticated]);

    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        skip: !isAuthenticated,
        onData: ({ data: subData }) => {
            const incoming = (subData.data as { allOrdersUpdated?: any[] } | null)?.allOrdersUpdated;
            if (!incoming || incoming.length === 0) return;

            incoming.forEach((order) => {
                if (!knownOrderIdsRef.current.has(order.id)) {
                    knownOrderIdsRef.current.add(order.id);
                    const ref = order.displayId || order.id.slice(-6);
                    const business = order.businesses?.[0]?.business?.name || 'Unknown business';
                    void notify('New order received', `Order #${ref} from ${business}.`, order.id);
                }
            });

            const merged = new Map<string, any>();
            ordersRef.current.forEach((order: any) => merged.set(order.id, order));
            incoming.forEach((order: any) => merged.set(order.id, { ...merged.get(order.id), ...order }));
            const nextOrders = Array.from(merged.values());
            ordersRef.current = nextOrders;
            void evaluateLatePending(nextOrders);
        },
    });

    useEffect(() => {
        if (!isAuthenticated) return;

        const timer = setInterval(() => {
            void evaluateLatePending(ordersRef.current);
        }, 60_000);

        return () => clearInterval(timer);
    }, [evaluateLatePending, isAuthenticated]);

    const lateThresholdMinutes = useMemo(() => LATE_PENDING_MINUTES, []);

    return {
        lateThresholdMinutes,
    };
}
