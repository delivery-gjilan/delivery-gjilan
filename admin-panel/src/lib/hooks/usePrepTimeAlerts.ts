import { useEffect, useRef, useCallback } from 'react';
import { useApolloClient, useSubscription } from '@apollo/client/react';
import type { AllOrdersUpdatedSubscription } from '@/gql/graphql';
import { ALL_ORDERS_SUBSCRIPTION } from '@/graphql/operations/orders/subscriptions';

export interface PrepTimeAlert {
    orderId: string;
    displayId: string;
    addedMinutes: number;
    newTotalMinutes: number;
    at: Date;
}

const ALERT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function usePrepTimeAlerts(
    setAlerts: React.Dispatch<React.SetStateAction<PrepTimeAlert[]>>,
) {
    const client = useApolloClient();
    // Track the last known preparationMinutes per order to detect changes
    const prevPrepMinutesRef = useRef<Map<string, number>>(new Map());
    const alertTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((orderId: string) => {
        setAlerts((prev) => prev.filter((a) => a.orderId !== orderId));
        const t = alertTimeoutsRef.current.get(orderId);
        if (t) {
            clearTimeout(t);
            alertTimeoutsRef.current.delete(orderId);
        }
    }, [setAlerts]);

    useSubscription<AllOrdersUpdatedSubscription>(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated;
            if (!incomingOrders) return;

            const newAlerts: PrepTimeAlert[] = [];

            incomingOrders.forEach((order) => {
                if (!order?.id || order.preparationMinutes == null) return;

                // Only track PREPARING orders
                if (order.status !== 'PREPARING') return;

                const orderId = String(order.id);
                const newMinutes = Number(order.preparationMinutes);
                const prevMinutes = prevPrepMinutesRef.current.get(orderId);

                if (prevMinutes !== undefined && newMinutes > prevMinutes) {
                    const addedMinutes = newMinutes - prevMinutes;
                    newAlerts.push({
                        orderId,
                        displayId: order.displayId ?? orderId,
                        addedMinutes,
                        newTotalMinutes: newMinutes,
                        at: new Date(),
                    });
                }

                prevPrepMinutesRef.current.set(orderId, newMinutes);
            });

            if (newAlerts.length > 0) {
                setAlerts((prev) => {
                    const byId = new Map(prev.map((a) => [a.orderId, a]));
                    newAlerts.forEach((a) => byId.set(a.orderId, a));
                    return Array.from(byId.values());
                });

                newAlerts.forEach((alert) => {
                    // Clear previous auto-dismiss for same order
                    const existing = alertTimeoutsRef.current.get(alert.orderId);
                    if (existing) clearTimeout(existing);

                    const t = setTimeout(() => {
                        setAlerts((prev) => prev.filter((a) => a.orderId !== alert.orderId));
                        alertTimeoutsRef.current.delete(alert.orderId);
                    }, ALERT_TTL_MS);

                    alertTimeoutsRef.current.set(alert.orderId, t);
                });
            }
        },
    });

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            alertTimeoutsRef.current.forEach((t) => clearTimeout(t));
        };
    }, []);

    return { dismiss };
}
