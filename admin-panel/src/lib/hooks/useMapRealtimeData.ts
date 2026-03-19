'use client';

import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GET_BUSINESSES } from '@/graphql/operations/businesses/queries';
import { DRIVERS_QUERY } from '@/graphql/operations/users/queries';
import { DRIVERS_UPDATED_SUBSCRIPTION } from '@/graphql/operations/users/subscriptions';
import { GET_ORDERS } from '@/graphql/operations/orders/queries';
import { ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/orders/subscriptions';

const SUBSCRIPTION_REFETCH_COOLDOWN_MS = 1500;
const DRIVER_POLL_MS = 10000;
const DRIVER_SUBSCRIPTION_FRESH_MS = 20000;

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
    } = useQuery(DRIVERS_QUERY);
    const { data: orderData, refetch: refetchOrders } = useQuery(GET_ORDERS);

    const [driversLive, setDriversLive] = useState<any[]>([]);
    const lastSubscriptionRefetchMsRef = useRef(0);
    const lastDriverSubscriptionMsRef = useRef(0);
    const isDriverPollingRef = useRef(true);

    useEffect(() => {
        startPolling(DRIVER_POLL_MS);
        return () => {
            stopPolling();
        };
    }, [startPolling, stopPolling]);

    useEffect(() => {
        const interval = setInterval(() => {
            const ageMs = Date.now() - lastDriverSubscriptionMsRef.current;
            const hasFreshSubscription =
                lastDriverSubscriptionMsRef.current > 0 && ageMs <= DRIVER_SUBSCRIPTION_FRESH_MS;

            if (hasFreshSubscription && isDriverPollingRef.current) {
                stopPolling();
                isDriverPollingRef.current = false;
                return;
            }

            if (!hasFreshSubscription && !isDriverPollingRef.current) {
                startPolling(DRIVER_POLL_MS);
                isDriverPollingRef.current = true;
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [startPolling, stopPolling]);

    useEffect(() => {
        if ((driverData as any)?.drivers) {
            setDriversLive((driverData as any).drivers);
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
            if (!incoming || incoming.length === 0) return;

            lastDriverSubscriptionMsRef.current = Date.now();
            if (isDriverPollingRef.current) {
                stopPolling();
                isDriverPollingRef.current = false;
            }

            setDriversLive((prev) => {
                const byId = new globalThis.Map<string, any>((prev || []).map((d: any) => [d.id, d]));
                incoming.forEach((driver: any) => {
                    byId.set(driver.id, { ...byId.get(driver.id), ...driver });
                });
                return Array.from(byId.values());
            });
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
