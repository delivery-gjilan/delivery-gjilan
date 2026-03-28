import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED, ASSIGN_DRIVER_TO_ORDER } from '@/graphql/operations/orders';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { useAuthStore } from '@/store/authStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import { useRouter } from 'expo-router';
import type { NavigationPhase } from '@/store/navigationStore';

/**
 * Global order-accept hook — runs in AppContent (root layout) so the accept
 * sheet surfaces on every screen, not just the map.
 *
 * Single source of truth for:
 *  - ALL_ORDERS_UPDATED subscription (updates Apollo cache once, globally)
 *  - Auto-present logic (capacity-aware)
 *  - Accept / skip handlers
 */
export function useGlobalOrderAccept() {
    const apolloClient = useApolloClient();
    const currentDriverId = useAuthStore((s) => s.user?.id);
    const isOnline = useAuthStore((s) => s.isOnline);
    const { dispatchModeEnabled } = useStoreStatus();
    const startNavigation = useNavigationStore((s) => s.startNavigation);
    const router = useRouter();

    const pendingOrder = useOrderAcceptStore((s) => s.pendingOrder);
    const autoCountdown = useOrderAcceptStore((s) => s.autoCountdown);
    const accepting = useOrderAcceptStore((s) => s.accepting);
    const lastOrdersRefreshAt = useRef(0);

    // ── Orders query (keeps cache warm when driver is off the map) ──
    const { data, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        skip: !currentDriverId,
    });

    const refreshOrders = useCallback(async () => {
        const now = Date.now();
        if (now - lastOrdersRefreshAt.current < 2500) {
            return;
        }
        lastOrdersRefreshAt.current = now;
        try {
            await refetch();
        } catch {
            // Best-effort freshness sync; keep existing cache if refetch fails.
        }
    }, [refetch]);

    // ── Driver metrics for capacity check ──
    const { data: metricsData } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: 'cache-first',
        skip: !currentDriverId,
    });
    const maxActiveOrders: number =
        (metricsData as any)?.myDriverMetrics?.maxActiveOrders ?? 5;

    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    // ── Single global subscription — updates cache; map.tsx reads from cache ──
    useSubscription(ALL_ORDERS_UPDATED, {
        skip: !currentDriverId,
        onData: ({ data: subData }) => {
            const incomingOrders = (subData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                void refreshOrders();
                return;
            }
            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                const byId = new Map(currentOrders.map((o: any) => [String(o?.id), o]));
                incomingOrders.forEach((o: any) => {
                    const prev = byId.get(String(o?.id));
                    byId.set(String(o?.id), { ...(prev as any), ...o });
                });
                return { ...(existing ?? {}), orders: Array.from(byId.values()) };
            });
        },
    });

    // Refresh once when driver session is active so resume/open always has a fresh baseline.
    useEffect(() => {
        if (!currentDriverId) return;
        void refreshOrders();
    }, [currentDriverId, refreshOrders]);

    // Refetch on foreground transition to backfill any events missed while app was backgrounded.
    useEffect(() => {
        if (!currentDriverId) return;
        const appStateSubscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                void refreshOrders();
            }
        });
        return () => {
            appStateSubscription.remove();
        };
    }, [currentDriverId, refreshOrders]);

    // ── Derived order lists ──
    const assignedOrders = useMemo(() => {
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => {
            if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
            return o.driver?.id === currentDriverId;
        });
    }, [data, currentDriverId]);

    const availableOrders = useMemo(() => {
        if (dispatchModeEnabled) return [];
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => o.status === 'READY' && !o.driver?.id);
    }, [data, dispatchModeEnabled]);

    // ── Auto-present (capacity-aware) ──
    useEffect(() => {
        const store = useOrderAcceptStore.getState();
        if (!isOnline || store.pendingOrder || dispatchModeEnabled) return;
        if (assignedOrders.length >= maxActiveOrders) return;
        const next = availableOrders.find((o: any) => !store.skippedIds.has(o.id));
        if (!next) return;
        store.setPendingOrder(next, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableOrders.length, isOnline, dispatchModeEnabled, assignedOrders.length, maxActiveOrders]);

    // ── Accept ──
    const handleAcceptOrder = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        useOrderAcceptStore.getState().setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            useOrderAcceptStore.getState().setPendingOrder(null);
        } catch {
            useOrderAcceptStore.getState().setPendingOrder(null);
        } finally {
            useOrderAcceptStore.getState().setAccepting(false);
        }
    }, [currentDriverId, assignDriver]);

    // ── Skip ──
    const handleSkipOrder = useCallback(() => {
        useOrderAcceptStore.getState().skipOrder();
    }, []);

    // ── Accept & immediately start navigation ──
    const handleAcceptAndNavigate = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        const order = useOrderAcceptStore.getState().pendingOrder;
        if (!order) return;

        useOrderAcceptStore.getState().setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            useOrderAcceptStore.getState().setPendingOrder(null);

            // Build navigation params from the order data we have right now
            const bizLoc = order.businesses?.[0]?.business?.location;
            const dropLoc = order.dropOffLocation;
            if (!bizLoc) return;

            const loc =
                useNavigationLocationStore.getState().location ??
                useNavigationLocationStore.getState().lastKnownCoords;
            if (!loc) return;

            const pickup = {
                latitude: Number(bizLoc.latitude),
                longitude: Number(bizLoc.longitude),
                label: order.businesses?.[0]?.business?.name ?? 'Pickup',
            };
            const dropoff = dropLoc
                ? {
                    latitude: Number(dropLoc.latitude),
                    longitude: Number(dropLoc.longitude),
                    label: dropLoc.address ?? 'Drop-off',
                }
                : null;
            const customerName = order.user
                ? `${order.user.firstName} ${order.user.lastName}`
                : 'Customer';

            const navOrder = {
                id: order.id,
                status: order.status,
                businessName: order.businesses?.[0]?.business?.name ?? 'Business',
                customerName,
                customerPhone: order.user?.phoneNumber ?? null,
                pickup,
                dropoff,
            };

            const phase: NavigationPhase =
                order.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';

            startNavigation(navOrder, phase, loc);
            router.push('/navigation' as any);
        } catch {
            useOrderAcceptStore.getState().setPendingOrder(null);
        } finally {
            useOrderAcceptStore.getState().setAccepting(false);
        }
    }, [currentDriverId, assignDriver, startNavigation, router]);

    return {
        pendingOrder,
        autoCountdown,
        accepting,
        handleAcceptOrder,
        handleSkipOrder,
        handleAcceptAndNavigate,
    };
}
