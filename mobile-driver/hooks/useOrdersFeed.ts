import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NetworkStatus } from '@apollo/client';
import { AppState } from 'react-native';
import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED } from '@/graphql/operations/orders';
import type { DriverOrder } from '@/utils/types';

/**
 * Manages the driver orders data layer:
 * - GET_ORDERS network query (keeps Apollo cache warm)
 * - ALL_ORDERS_UPDATED subscription (updates cache globally)
 * - Bootstrap flag so stale persisted cache never leaks into the UI on cold start
 * - AppState refetch to backfill events missed while backgrounded
 */
export function useOrdersFeed(driverId: string | undefined) {
    const apolloClient = useApolloClient();
    const lastOrdersRefreshAt = useRef(0);
    const [networkReady, setNetworkReady] = useState(false);
    const [bootstrapExpired, setBootstrapExpired] = useState(false);
    const [subscriptionOrders, setSubscriptionOrders] = useState<DriverOrder[] | null>(null);

    const { data, refetch, networkStatus } = useQuery(GET_ORDERS, {
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
        skip: !driverId,
    });

    // Mark network as ready once the first real response arrives
    useEffect(() => {
        if (!networkReady && data?.orders?.orders && networkStatus === NetworkStatus.ready) {
            setNetworkReady(true);
        }
    }, [networkStatus, networkReady, data]);

    // Bootstrap expiry guard — prevents an infinite loader on slow cold starts
    useEffect(() => {
        setBootstrapExpired(false);
        if (!driverId) return;
        const timer = setTimeout(() => setBootstrapExpired(true), 12000);
        return () => clearTimeout(timer);
    }, [driverId]);

    const refreshOrders = useCallback(async () => {
        const now = Date.now();
        if (now - lastOrdersRefreshAt.current < 2500) return;
        lastOrdersRefreshAt.current = now;
        try {
            await refetch();
        } catch {
            // Best-effort freshness sync; keep existing cache if refetch fails.
        }
    }, [refetch]);

    // Retry after error during bootstrap
    useEffect(() => {
        if (networkReady || !driverId) return;
        if (networkStatus !== NetworkStatus.error) return;
        const retryTimer = setTimeout(() => { void refreshOrders(); }, 3000);
        return () => clearTimeout(retryTimer);
    }, [driverId, networkReady, networkStatus, refreshOrders]);

    // Single global subscription — writes into Apollo cache so all screens benefit
    useSubscription(ALL_ORDERS_UPDATED, {
        skip: !driverId,
        onData: ({ data: subData }) => {
            const incomingOrders = subData.data?.allOrdersUpdated;
            if (incomingOrders === undefined || incomingOrders === null) {
                void refreshOrders();
                return;
            }
            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing) => ({
                ...(existing ?? {}),
                orders: {
                    ...(existing?.orders ?? {}),
                    orders: incomingOrders,
                    __typename: 'OrderConnection' as const,
                },
            }));
            setSubscriptionOrders(incomingOrders);
            setNetworkReady(true);
        },
    });

    // Refetch on foreground to backfill events missed while backgrounded
    useEffect(() => {
        if (!driverId) return;
        const sub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') void refreshOrders();
        });
        return () => sub.remove();
    }, [driverId, refreshOrders]);

    const cachedOrders = useMemo(() => {
        try {
            return apolloClient.readQuery({ query: GET_ORDERS })?.orders?.orders ?? [];
        } catch {
            return [];
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apolloClient, data, subscriptionOrders]);

    const orders = useMemo(() => {
        // Prefer fresh query response, then live subscription payload.
        // Fall back to persisted Apollo cache ONLY after networkReady (prevents stale cold-start data).
        return data?.orders?.orders ?? subscriptionOrders ?? (networkReady ? cachedOrders : []);
    }, [data, subscriptionOrders, cachedOrders, networkReady]);

    const isOrdersBootstrapping =
        !!driverId &&
        !networkReady &&
        networkStatus === NetworkStatus.loading &&
        !bootstrapExpired;

    return { orders, networkReady, isOrdersBootstrapping, refreshOrders, lastOrdersRefreshAt };
}
