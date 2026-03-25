import { useCallback, useEffect, useRef } from 'react';
import { useApolloClient, useSubscription } from '@apollo/client/react';
import { ADMIN_GET_ORDERS, ADMIN_ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/admin/orders';
import { ADMIN_DRIVERS_UPDATED_SUBSCRIPTION, ADMIN_GET_DRIVERS } from '@/graphql/operations/admin/drivers';

/**
 * Single subscription for admin order + driver updates.
 * Mount once in the admin tabs layout — both map and orders screens read
 * from Apollo cache via useQuery(ADMIN_GET_ORDERS) with cache-first.
 */
export function useAdminOrdersSubscription() {
    const apolloClient = useApolloClient();

    // Throttled refetch refs — orders
    const ordersRefetchCooldownRef = useRef(0);
    const ordersRefetchInFlightRef = useRef(false);
    const ordersRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Throttled refetch refs — drivers
    const driversRefetchCooldownRef = useRef(0);
    const driversRefetchInFlightRef = useRef(false);
    const driversRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (ordersRefetchTimerRef.current) clearTimeout(ordersRefetchTimerRef.current);
            if (driversRefetchTimerRef.current) clearTimeout(driversRefetchTimerRef.current);
        };
    }, []);

    const scheduleOrdersRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - ordersRefetchCooldownRef.current >= 1200 && !ordersRefetchInFlightRef.current;
        if (!canRunNow) {
            if (ordersRefetchTimerRef.current) return;
            ordersRefetchTimerRef.current = setTimeout(() => {
                ordersRefetchTimerRef.current = null;
                if (ordersRefetchInFlightRef.current) return;
                ordersRefetchInFlightRef.current = true;
                ordersRefetchCooldownRef.current = Date.now();
                apolloClient.query({ query: ADMIN_GET_ORDERS, fetchPolicy: 'network-only' })
                    .finally(() => { ordersRefetchInFlightRef.current = false; });
            }, 350);
            return;
        }
        ordersRefetchInFlightRef.current = true;
        ordersRefetchCooldownRef.current = now;
        apolloClient.query({ query: ADMIN_GET_ORDERS, fetchPolicy: 'network-only' })
            .finally(() => { ordersRefetchInFlightRef.current = false; });
    }, [apolloClient]);

    const scheduleDriversRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - driversRefetchCooldownRef.current >= 1200 && !driversRefetchInFlightRef.current;
        if (!canRunNow) {
            if (driversRefetchTimerRef.current) return;
            driversRefetchTimerRef.current = setTimeout(() => {
                driversRefetchTimerRef.current = null;
                if (driversRefetchInFlightRef.current) return;
                driversRefetchInFlightRef.current = true;
                driversRefetchCooldownRef.current = Date.now();
                apolloClient.query({ query: ADMIN_GET_DRIVERS, fetchPolicy: 'network-only' })
                    .finally(() => { driversRefetchInFlightRef.current = false; });
            }, 350);
            return;
        }
        driversRefetchInFlightRef.current = true;
        driversRefetchCooldownRef.current = now;
        apolloClient.query({ query: ADMIN_GET_DRIVERS, fetchPolicy: 'network-only' })
            .finally(() => { driversRefetchInFlightRef.current = false; });
    }, [apolloClient]);

    useSubscription(ADMIN_ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = (subscriptionData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleOrdersRefetch();
                return;
            }
            apolloClient.cache.updateQuery({ query: ADMIN_GET_ORDERS }, (existing: any) => {
                const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                const byId = new Map(currentOrders.map((o: any) => [String(o?.id), o]));
                incomingOrders.forEach((o: any) => {
                    byId.set(String(o?.id), { ...(byId.get(String(o?.id)) as any), ...o });
                });
                return { ...(existing ?? {}), orders: Array.from(byId.values()) };
            });
        },
    });

    useSubscription(ADMIN_DRIVERS_UPDATED_SUBSCRIPTION, {
        onData: () => scheduleDriversRefetch(),
    });
}
