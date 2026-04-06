import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NetworkStatus } from '@apollo/client';
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
    const acceptError = useOrderAcceptStore((s) => s.acceptError);
    const skippedAt = useOrderAcceptStore((s) => s.skippedAt);
    const lastOrdersRefreshAt = useRef(0);

    // ── Orders query (keeps cache warm when driver is off the map) ──
    const { data, refetch, networkStatus } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
        skip: !currentDriverId,
    });

    // True once the first real network response arrives — prevents auto-present
    // from firing against a stale persisted Apollo cache on app cold-start.
    // With apollo3-cache-persist the cache is pre-populated, so networkStatus
    // can start at NetworkStatus.ready (7) from cache before any network call
    // completes. We track whether we've seen a loading/in-flight state first so
    // we only unblock auto-present after a genuine round-trip.
    const [networkReady, setNetworkReady] = useState(false);
    const seenLoadingRef = useRef(false);
    useEffect(() => {
        if (networkStatus === NetworkStatus.loading || networkStatus === NetworkStatus.refetch) {
            seenLoadingRef.current = true;
        }
        if (!networkReady) {
            if (seenLoadingRef.current && networkStatus === NetworkStatus.ready) {
                setNetworkReady(true);
            } else if (networkStatus === NetworkStatus.error) {
                // Network failed; still unblock so driver isn't stuck forever.
                setNetworkReady(true);
            }
        }
    }, [networkStatus, networkReady]);

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
        fetchPolicy: 'cache-and-network',
        skip: !currentDriverId,
    });
    const maxActiveOrders: number =
        (metricsData as any)?.myDriverMetrics?.maxActiveOrders ?? 5;

    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    // ── Single global subscription — updates cache; drive.tsx reads from cache ──
    useSubscription(ALL_ORDERS_UPDATED, {
        skip: !currentDriverId,
        onData: ({ data: subData }) => {
            const incomingOrders = (subData.data as any)?.allOrdersUpdated as any[] | undefined;
            if (incomingOrders === undefined || incomingOrders === null) {
                // Truly missing payload (parse error / network issue) — fall back to refetch
                void refreshOrders();
                return;
            }
            // Replace cache with full server list. Empty array [] is valid — means all orders done.
            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                return { ...(existing ?? {}), orders: incomingOrders };
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

    // ── Precise per-order timers: fire exactly when each PREPARING order crosses
    //    the 5-min threshold instead of polling every 30s.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const orders = (data as any)?.orders ?? [];
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (const o of orders) {
            if (o.status !== 'PREPARING' || o.driver?.id || !o.estimatedReadyAt) continue;
            const thresholdMs = new Date(o.estimatedReadyAt).getTime() - 5 * 60 * 1000;
            const delayMs = thresholdMs - Date.now();
            if (delayMs <= 0) continue; // already past threshold — useMemo handles it immediately
            timers.push(setTimeout(() => setNow(Date.now()), delayMs));
        }
        return () => timers.forEach(clearTimeout);
    }, [data]);

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
        const skippedIds = useOrderAcceptStore.getState().getActiveSkippedIds();
        return orders.filter((o: any) => {
            if (o.driver?.id) return false;
            if (skippedIds.has(o.id)) return false;
            if (o.status === 'READY') return true;
            if (o.status === 'PREPARING') {
                const estimatedReadyAt = o.estimatedReadyAt ? new Date(o.estimatedReadyAt).getTime() : null;
                return estimatedReadyAt !== null && estimatedReadyAt - now <= 5 * 60 * 1000;
            }
            return false;
        });
    }, [data, dispatchModeEnabled, now, skippedAt]);

    // Pool shows ALL eligible orders regardless of skip — driver can still manually pick a skipped order.
    const poolOrders = useMemo(() => {
        if (dispatchModeEnabled) return [];
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => {
            if (o.driver?.id) return false;
            if (o.status === 'READY') return true;
            if (o.status === 'PREPARING') {
                const estimatedReadyAt = o.estimatedReadyAt ? new Date(o.estimatedReadyAt).getTime() : null;
                return estimatedReadyAt !== null && estimatedReadyAt - now <= 5 * 60 * 1000;
            }
            return false;
        });
    }, [data, dispatchModeEnabled, now]);

    // ── Live order: always read the freshest version from Apollo cache ──
    // pendingOrder in the store holds the ID-reference from when it was auto-presented;
    // we derive the live data by looking it up in the orders array so the modal
    // shows up-to-date fields (estimatedReadyAt, status, items) without a separate query.
    const liveOrder = useMemo(() => {
        if (!pendingOrder) return null;
        const orders = (data as any)?.orders ?? [];
        return orders.find((o: any) => o.id === pendingOrder.id) ?? pendingOrder;
    }, [pendingOrder, data]);

    // ── Dismiss stale modal: clear pendingOrder if it's no longer in availableOrders ──
    // Skip when takenByOther is active — the 3-second overlay timer owns the dismissal.
    // Skip when accepting — the subscription may fire before the mutation error returns,
    // which would clear pendingOrder before we can show the "taken" overlay.
    useEffect(() => {
        const store = useOrderAcceptStore.getState();
        if (!store.pendingOrder) return;
        if (store.takenByOther || store.accepting) return;
        const stillAvailable = availableOrders.some((o: any) => o.id === store.pendingOrder.id);
        if (!stillAvailable) {
            // Check why it disappeared: still in the order list but now has a different driver
            // means someone else took it — show the overlay instead of silently dismissing.
            const allOrders = (data as any)?.orders ?? [];
            const currentOrder = allOrders.find((o: any) => o.id === store.pendingOrder.id);
            if (currentOrder?.driver?.id && currentOrder.driver.id !== currentDriverId) {
                store.setTakenByOther(true);
            } else {
                store.setPendingOrder(null);
            }
        }
    }, [availableOrders, data, currentDriverId]);

    // ── Auto-present (capacity-aware) ──
    // Depends on pendingOrder so after skip/dismiss the next order surfaces immediately.
    useEffect(() => {
        const store = useOrderAcceptStore.getState();
        if (!networkReady || !isOnline || store.pendingOrder || dispatchModeEnabled) return;
        if (assignedOrders.length >= maxActiveOrders) return;
        const next = availableOrders[0];
        if (!next) return;
        store.setPendingOrder(next, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableOrders.length, pendingOrder, networkReady, isOnline, dispatchModeEnabled, assignedOrders.length, maxActiveOrders]);

    // ── Accept ──
    const handleAcceptOrder = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        // Debounce: block if a mutation is already in-flight
        if (!useOrderAcceptStore.getState().tryLockAccept()) return;
        // Offline guard
        if (!useAuthStore.getState().isOnline) {
            useOrderAcceptStore.getState().setAcceptError('You are offline. Please check your connection.');
            useOrderAcceptStore.getState().setAccepting(false);
            (useOrderAcceptStore.getState() as any)._acceptingRef = false;
            return;
        }
        useOrderAcceptStore.getState().setAcceptError(null);
        useOrderAcceptStore.getState().setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            useOrderAcceptStore.getState().setPendingOrder(null);
            // Force immediate refetch — bypass debounce — so this order vanishes from the pool right away
            lastOrdersRefreshAt.current = 0;
            void refetch();
        } catch (err: any) {
            const msg = err?.message?.toLowerCase() ?? '';
            console.error('[accept] assignDriverToOrder failed:', err?.message, err?.graphQLErrors);
            if (msg.includes('already') || msg.includes('assigned') || msg.includes('taken')) {
                useOrderAcceptStore.getState().setTakenByOther(true);
                // pendingOrder stays alive — layout timer will clear both after 3s
            } else {
                useOrderAcceptStore.getState().setPendingOrder(null);
                if (msg.includes('maximum') || msg.includes('max active')) {
                    useOrderAcceptStore.getState().setAcceptError('You have reached your maximum active orders.');
                } else if (msg.includes('not available') || msg.includes('not available for driver')) {
                    useOrderAcceptStore.getState().setAcceptError('This order is no longer available.');
                } else {
                    useOrderAcceptStore.getState().setAcceptError(`Failed to accept: ${err?.message ?? 'Please try again.'}`);
                }
            }
        } finally {
            useOrderAcceptStore.getState().setAccepting(false);
        }
    }, [currentDriverId, assignDriver, refetch]);

    // ── Skip ──
    const handleSkipOrder = useCallback(() => {
        useOrderAcceptStore.getState().skipOrder();
    }, []);

    // ── Accept & immediately start navigation ──
    const handleAcceptAndNavigate = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        if (!useOrderAcceptStore.getState().tryLockAccept()) return;
        if (!useAuthStore.getState().isOnline) {
            useOrderAcceptStore.getState().setAcceptError('You are offline. Please check your connection.');
            useOrderAcceptStore.getState().setAccepting(false);
            (useOrderAcceptStore.getState() as any)._acceptingRef = false;
            return;
        }
        const order = useOrderAcceptStore.getState().pendingOrder;
        if (!order) return;

        useOrderAcceptStore.getState().setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            useOrderAcceptStore.getState().setPendingOrder(null);
            lastOrdersRefreshAt.current = 0;
            void refetch();

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
        } catch (err: any) {
            const msg = err?.message?.toLowerCase() ?? '';
            console.error('[accept+nav] assignDriverToOrder failed:', err?.message, err?.graphQLErrors);
            if (msg.includes('already') || msg.includes('assigned') || msg.includes('taken')) {
                useOrderAcceptStore.getState().setTakenByOther(true);
                // pendingOrder stays alive — layout timer will clear both after 3s
            } else {
                useOrderAcceptStore.getState().setPendingOrder(null);
                if (msg.includes('maximum') || msg.includes('max active')) {
                    useOrderAcceptStore.getState().setAcceptError('You have reached your maximum active orders.');
                } else if (msg.includes('not available') || msg.includes('not available for driver')) {
                    useOrderAcceptStore.getState().setAcceptError('This order is no longer available.');
                } else {
                    useOrderAcceptStore.getState().setAcceptError(`Failed to accept: ${err?.message ?? 'Please try again.'}`);
                }
            }
        } finally {
            useOrderAcceptStore.getState().setAccepting(false);
        }
    }, [currentDriverId, assignDriver, startNavigation, router, refetch]);

    const takenByOther = useOrderAcceptStore((s) => s.takenByOther);

    return {
        pendingOrder: liveOrder,
        autoCountdown,
        accepting,
        acceptError,
        takenByOther,
        availableOrders,
        poolOrders,
        handleAcceptOrder,
        handleSkipOrder,
        handleAcceptAndNavigate,
    };
}
