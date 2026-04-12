'use client';

import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AllOrdersUpdatedDocument,
    BusinessesDocument,
    DriversDocument,
    DriversUpdatedDocument,
    GetOrdersDocument,
} from '@/gql/graphql';
import { playNewOrderAlert } from '@/lib/audio/orderAlert';
import { toast } from 'sonner';

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
    const { data: businessData } = useQuery(BusinessesDocument);
    const {
        data: driverData,
        startPolling,
        stopPolling,
    } = useQuery(DriversDocument, { fetchPolicy: 'no-cache' });
    const { data: orderData, refetch: refetchOrders } = useQuery(GetOrdersDocument);

    const [driversLive, setDriversLive] = useState<any[]>([]);
    const [realtimeHealth, setRealtimeHealth] = useState({
        driverLastSubAtMs: 0,
        orderLastSubAtMs: 0,
        driverPollingFallback: true,
        orderFallbackRefetchAtMs: 0,
    });
    const lastSubscriptionRefetchMsRef = useRef(0);
    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const hasInitializedKnownIdsRef = useRef(false);
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
                setRealtimeHealth((prev) => ({ ...prev, driverPollingFallback: false }));
            } else if (!subAlive && !isDriverPollingRef.current) {
                startPolling(DRIVER_POLL_MS);
                isDriverPollingRef.current = true;
                setRealtimeHealth((prev) => ({ ...prev, driverPollingFallback: true }));
            }
        }, 5000);

        // Start polling initially until the first subscription event arrives
        startPolling(DRIVER_POLL_MS);
        isDriverPollingRef.current = true;
        setRealtimeHealth((prev) => ({ ...prev, driverPollingFallback: true }));

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

    useEffect(() => {
        const connection = (orderData as any)?.orders;
        const currentOrders = Array.isArray(connection?.orders) ? connection.orders : [];
        if (currentOrders.length === 0) return;

        currentOrders.forEach((order: any) => {
            if (order?.id) knownOrderIdsRef.current.add(String(order.id));
        });

        hasInitializedKnownIdsRef.current = true;
    }, [orderData]);

    useSubscription(AllOrdersUpdatedDocument, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = (subscriptionData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (incomingOrders && incomingOrders.length > 0) {
                const validIncomingOrders = incomingOrders.filter((order: any) =>
                    order && typeof order === 'object' && order.id,
                );

                if (validIncomingOrders.length === 0) {
                    const now = Date.now();
                    if (now - lastSubscriptionRefetchMsRef.current < SUBSCRIPTION_REFETCH_COOLDOWN_MS) {
                        return;
                    }
                    lastSubscriptionRefetchMsRef.current = now;
                    setRealtimeHealth((prev) => ({ ...prev, orderFallbackRefetchAtMs: now }));
                    refetchOrders();
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
                    const inventoryOrders = newActiveOrders.filter((o: any) =>
                        o.inventoryPrice != null && Number(o.inventoryPrice) > 0
                    );
                    if (inventoryOrders.length > 0) {
                        toast('📦 Stock order incoming', {
                            description: `${inventoryOrders.length} order${inventoryOrders.length > 1 ? 's' : ''} use${inventoryOrders.length > 1 ? '' : 's'} your inventory — check Fulfillment Guide`,
                            duration: 8000,
                        });
                    }
                }

                setRealtimeHealth((prev) => ({ ...prev, orderLastSubAtMs: Date.now() }));
                apolloClient.cache.updateQuery({ query: GetOrdersDocument }, (existing: any) => {
                    const connection = existing?.orders;
                    const currentOrders = Array.isArray(connection?.orders) ? connection.orders : [];
                    const byId = new globalThis.Map<string, any>(
                        currentOrders.map((order: any) => [String(order?.id), order]),
                    );

                    validIncomingOrders.forEach((order: any) => {
                        const existingOrder = byId.get(String(order?.id));
                        byId.set(String(order?.id), { ...existingOrder, ...order });
                    });

                    return {
                        ...(existing ?? {}),
                        orders: {
                            ...(connection ?? {}),
                            orders: Array.from(byId.values()),
                        },
                    };
                });
                return;
            }

            const now = Date.now();
            if (now - lastSubscriptionRefetchMsRef.current < SUBSCRIPTION_REFETCH_COOLDOWN_MS) {
                return;
            }
            lastSubscriptionRefetchMsRef.current = now;
            setRealtimeHealth((prev) => ({ ...prev, orderFallbackRefetchAtMs: now }));
            refetchOrders();
        },
    });

    useSubscription(DriversUpdatedDocument, {
        onData: ({ data: subscriptionData }) => {
            const incoming = (subscriptionData.data as any)?.driversUpdated as any[] | undefined;
            const s = incoming?.[0];
            console.log(`[RT:sub] ${incoming?.length ?? 0} drivers`, s ? `${s.id.slice(0,8)} lat=${s.driverLocation?.latitude} updatedAt=${s.driverLocationUpdatedAt}` : 'empty');
            if (!incoming || incoming.length === 0) return;

            lastDriverSubscriptionMsRef.current = Date.now();
            setRealtimeHealth((prev) => ({ ...prev, driverLastSubAtMs: Date.now(), driverPollingFallback: false }));
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
    const connection = (orderData as any)?.orders;
    const orders = useMemo(() => (Array.isArray(connection?.orders) ? connection.orders : []) as any[], [connection]);
    const drivers = useMemo(() => driversLive ?? [], [driversLive]);

    return {
        businesses,
        orders,
        drivers,
        realtimeHealth,
    };
}
