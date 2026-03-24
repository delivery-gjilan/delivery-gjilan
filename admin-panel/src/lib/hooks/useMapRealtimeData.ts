'use client';

import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GET_BUSINESSES } from '@/graphql/operations/businesses/queries';
import { DRIVERS_QUERY } from '@/graphql/operations/users/queries';
import { DRIVERS_UPDATED_SUBSCRIPTION } from '@/graphql/operations/users/subscriptions';
import { GET_ORDERS } from '@/graphql/operations/orders/queries';
import { ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/orders/subscriptions';

const SUBSCRIPTION_REFETCH_COOLDOWN_MS = 1500;
const DRIVER_POLL_MS = 30000; // polling is a fallback only; subscription is primary
const DRIVER_SUBSCRIPTION_FRESH_MS = 20000;

/** Merge incoming drivers into existing list, keeping the newest location per driver. */
function mergeDriversByTimestamp(existing: any[], incoming: any[]): any[] {
    const byId = new globalThis.Map<string, any>((existing || []).map((d: any) => [d.id, d]));
    for (const driver of incoming) {
        const prev = byId.get(driver.id);
        if (prev?.driverLocationUpdatedAt && driver.driverLocationUpdatedAt) {
            const prevTs = new Date(prev.driverLocationUpdatedAt).getTime();
            const nextTs = new Date(driver.driverLocationUpdatedAt).getTime();
            if (nextTs < prevTs) continue; // skip stale
        }
        byId.set(driver.id, { ...prev, ...driver });
    }
    return Array.from(byId.values());
}

export function useMapRealtimeData() {
    const apolloClient = useApolloClient();

    // Sync model:
    // - Drivers: query with poll safety net + subscription merge into local state.
    // - Orders: query + payload-first subscription cache updates + cooldown fallback refetch.
    const { data: businessData } = useQuery(GET_BUSINESSES);
    const {
        data: driverData,
        startPolling,
        stopPolling,
    } = useQuery(DRIVERS_QUERY, { fetchPolicy: 'no-cache' });
    const { data: orderData, refetch: refetchOrders } = useQuery(GET_ORDERS);

    const [driversLive, setDriversLive] = useState<any[]>([]);
    const lastSubscriptionRefetchMsRef = useRef(0);
    const lastDriverSubscriptionMsRef = useRef(0);
    const isDriverPollingRef = useRef(false);

    // Polling is a pure fallback — only activate when the subscription
    // hasn't delivered data within DRIVER_SUBSCRIPTION_FRESH_MS.
    useEffect(() => {
        const interval = setInterval(() => {
            const ageMs = Date.now() - lastDriverSubscriptionMsRef.current;
            const subAlive =
                lastDriverSubscriptionMsRef.current > 0 && ageMs <= DRIVER_SUBSCRIPTION_FRESH_MS;

            if (subAlive && isDriverPollingRef.current) {
                stopPolling();
                isDriverPollingRef.current = false;
            } else if (!subAlive && !isDriverPollingRef.current) {
                startPolling(DRIVER_POLL_MS);
                isDriverPollingRef.current = true;
            }
        }, 5000);

        // Start polling initially until the first subscription event arrives
        startPolling(DRIVER_POLL_MS);
        isDriverPollingRef.current = true;

        return () => {
            clearInterval(interval);
            stopPolling();
        };
    }, [startPolling, stopPolling]);

    useEffect(() => {
        if ((driverData as any)?.drivers) {
            const drivers = (driverData as any).drivers as any[];
            const s = drivers[0];
            console.log(`[RT:poll] ${drivers.length} drivers`, s ? `${s.id.slice(0,8)} lat=${s.driverLocation?.latitude} updatedAt=${s.driverLocationUpdatedAt}` : 'empty');
            setDriversLive((prev) => mergeDriversByTimestamp(prev, drivers));
        }
    }, [driverData]);

    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = (subscriptionData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (incomingOrders && incomingOrders.length > 0) {
                apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                    const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                    const byId = new globalThis.Map<string, any>(
                        currentOrders.map((order: any) => [String(order?.id), order]),
                    );

                    incomingOrders.forEach((order: any) => {
                        const existingOrder = byId.get(String(order?.id));
                        byId.set(String(order?.id), { ...existingOrder, ...order });
                    });

                    return {
                        ...(existing ?? {}),
                        orders: Array.from(byId.values()),
                    };
                });
                return;
            }

            const now = Date.now();
            if (now - lastSubscriptionRefetchMsRef.current < SUBSCRIPTION_REFETCH_COOLDOWN_MS) {
                return;
            }
            lastSubscriptionRefetchMsRef.current = now;
            refetchOrders();
        },
    });

    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incoming = (subscriptionData.data as any)?.driversUpdated as any[] | undefined;
            const s = incoming?.[0];
            console.log(`[RT:sub] ${incoming?.length ?? 0} drivers`, s ? `${s.id.slice(0,8)} lat=${s.driverLocation?.latitude} updatedAt=${s.driverLocationUpdatedAt}` : 'empty');
            if (!incoming || incoming.length === 0) return;

            lastDriverSubscriptionMsRef.current = Date.now();
            if (isDriverPollingRef.current) {
                stopPolling();
                isDriverPollingRef.current = false;
            }

            setDriversLive((prev) => mergeDriversByTimestamp(prev, incoming));
        },
        onError: (err) => {
            console.error('[RT:sub] driversUpdated subscription error:', err);
        },
    });

    const businesses = useMemo(() => (businessData as any)?.businesses ?? [], [businessData]);
    const orders = useMemo(() => ((orderData as any)?.orders ?? []) as any[], [orderData]);
    const drivers = useMemo(() => driversLive ?? [], [driversLive]);

    return {
        businesses,
        orders,
        drivers,
    };
}
