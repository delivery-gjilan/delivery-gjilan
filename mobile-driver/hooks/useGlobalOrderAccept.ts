import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { useAuthStore } from '@/store/authStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useOrdersFeed } from '@/hooks/useOrdersFeed';
import { useAcceptOrderMutation } from '@/hooks/useAcceptOrderMutation';

/**
 * Global order-accept hook — runs in AppContent (root layout) so the accept
 * sheet surfaces on every screen, not just the map.
 *
 * Single source of truth for:
 *  - ALL_ORDERS_UPDATED subscription (updates Apollo cache once, globally)
 *  - Auto-present logic (capacity-aware)
 *  - Accept / skip handlers
 *
 * Sub-hooks:
 *  - useOrdersFeed   — network query + subscription + bootstrap state
 *  - useAcceptOrderMutation — accept/skip/navigate mutation logic
 */
export function useGlobalOrderAccept() {
    const hasHydrated = useAuthStore((s) => s.hasHydrated);
    const currentDriverId = useAuthStore((s) => s.user?.id);
    const isOnline = useAuthStore((s) => s.isOnline);
    const { dispatchModeEnabled } = useStoreStatus();

    const pendingOrder = useOrderAcceptStore((s) => s.pendingOrder);
    const autoCountdown = useOrderAcceptStore((s) => s.autoCountdown);
    const accepting = useOrderAcceptStore((s) => s.accepting);
    const acceptError = useOrderAcceptStore((s) => s.acceptError);
    const skippedAt = useOrderAcceptStore((s) => s.skippedAt);

    // ── Orders feed (query + subscription + bootstrap) ──
    const driverId = hasHydrated ? currentDriverId : undefined;
    const { orders, networkReady, isOrdersBootstrapping, refreshOrders, lastOrdersRefreshAt } =
        useOrdersFeed(driverId);

    // ── Driver metrics for capacity check ──
    const { data: metricsData } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: 'cache-and-network',
        skip: !currentDriverId,
    });
    const maxActiveOrders: number =
        metricsData?.myDriverMetrics?.maxActiveOrders ?? 5;

    // ── Accept / skip / navigate mutations ──
    const { handleAcceptOrder, handleSkipOrder, handleAcceptAndNavigate } = useAcceptOrderMutation({
        currentDriverId,
        lastOrdersRefreshAt,
        refetchOrders: refreshOrders,
    });

    const getEstimatedReadyMs = (order: { estimatedReadyAt?: string | null; preparingAt?: string | null; preparationMinutes?: number | null }): number | null => {
        const estimatedReadyRaw = order?.estimatedReadyAt;
        if (estimatedReadyRaw) {
            const estimatedReadyMs = new Date(estimatedReadyRaw).getTime();
            if (Number.isFinite(estimatedReadyMs)) return estimatedReadyMs;
        }

        const preparingAtRaw = order?.preparingAt;
        const prepMinutes = Number(order?.preparationMinutes);
        if (preparingAtRaw && Number.isFinite(prepMinutes) && prepMinutes > 0) {
            const preparingAtMs = new Date(preparingAtRaw).getTime();
            if (Number.isFinite(preparingAtMs)) return preparingAtMs + prepMinutes * 60 * 1000;
        }

        return null;
    };

    // ── Precise per-order timers: fire exactly when each PREPARING order crosses
    //    the 5-min threshold instead of polling every 30s.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (const o of orders) {
            if (o.status !== 'PREPARING' || o.driver?.id) continue;
            const readyAtMs = getEstimatedReadyMs(o);
            if (!readyAtMs) continue;
            const thresholdMs = readyAtMs - 5 * 60 * 1000;
            const delayMs = thresholdMs - Date.now();
            if (delayMs <= 0) continue; // already past threshold — useMemo handles it immediately
            timers.push(setTimeout(() => setNow(Date.now()), delayMs));
        }
        return () => timers.forEach(clearTimeout);
    }, [orders, getEstimatedReadyMs]);

    // Fallback ticker to avoid missing threshold transitions when JS timers are
    // paused (e.g. brief backgrounding) or when ETA fields change without a
    // full orders list identity change.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    // ── Derived order lists ──
    const assignedOrders = useMemo(() => {
        return orders.filter((o) => {
            if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
            return o.driver?.id === currentDriverId;
        });
    }, [orders, currentDriverId]);

    useEffect(() => {
        const assignedIds = assignedOrders.map((order) => String(order.id));
        useOrderAcceptStore.getState().markAssignedOrders(assignedIds);
    }, [assignedOrders]);

    const availableOrders = useMemo(() => {
        if (dispatchModeEnabled) return [];
        const assignedIds = assignedOrders.map((order) => String(order.id));
        const skippedIds = useOrderAcceptStore.getState().getActiveSkippedIds(assignedIds);
        return orders.filter((o) => {
            if (o.driver?.id) return false;
            if (skippedIds.has(o.id)) return false;
            if (o.status === 'READY') return true;
            if (o.status === 'PREPARING') {
                const estimatedReadyMs = getEstimatedReadyMs(o);
                return estimatedReadyMs !== null && estimatedReadyMs - now <= 5 * 60 * 1000;
            }
            return false;
        }).sort((a, b) => {
            // Keep READY ahead of PREPARING, then sort PREPARING by nearest ETA.
            const rank = (status: string) => (status === 'READY' ? 0 : status === 'PREPARING' ? 1 : 2);
            const rankDiff = rank(a.status) - rank(b.status);
            if (rankDiff !== 0) return rankDiff;

            const aEta = getEstimatedReadyMs(a) ?? Number.MAX_SAFE_INTEGER;
            const bEta = getEstimatedReadyMs(b) ?? Number.MAX_SAFE_INTEGER;
            return aEta - bEta;
        });
    }, [assignedOrders, dispatchModeEnabled, getEstimatedReadyMs, now, orders, skippedAt]);

    // Pool shows ALL eligible orders regardless of skip — driver can still manually pick a skipped order.
    const poolOrders = useMemo(() => {
        if (dispatchModeEnabled) return [];
        return orders.filter((o) => {
            if (o.driver?.id) return false;
            if (o.status === 'READY') return true;
            if (o.status === 'PREPARING') {
                const estimatedReadyMs = getEstimatedReadyMs(o);
                return estimatedReadyMs !== null && estimatedReadyMs - now <= 5 * 60 * 1000;
            }
            return false;
        });
    }, [dispatchModeEnabled, getEstimatedReadyMs, now, orders]);

    // ── Live order: always read the freshest version from Apollo cache ──
    // pendingOrder in the store holds the ID-reference from when it was auto-presented;
    // we derive the live data by looking it up in the orders array so the modal
    // shows up-to-date fields (estimatedReadyAt, status, items) without a separate query.
    const liveOrder = useMemo(() => {
        if (!pendingOrder) return null;
        return orders.find((o) => o.id === pendingOrder.id) ?? pendingOrder;
    }, [pendingOrder, orders]);

    // ── Dismiss stale modal: clear pendingOrder if it's no longer in availableOrders ──
    // Skip when takenByOther is active — the 3-second overlay timer owns the dismissal.
    // Skip when accepting — the subscription may fire before the mutation error returns,
    // which would clear pendingOrder before we can show the "taken" overlay.
    useEffect(() => {
        const store = useOrderAcceptStore.getState();
        if (!store.pendingOrder) return;
        if (store.takenByOther || store.accepting) return;
        const stillAvailable = availableOrders.some((o) => o.id === store.pendingOrder.id);
        if (!stillAvailable) {
            // Check why it disappeared: still in the order list but now has a different driver
            // means someone else took it — show the overlay instead of silently dismissing.
            const currentOrder = orders.find((o) => o.id === store.pendingOrder.id);
            if (currentOrder?.driver?.id && currentOrder.driver.id !== currentDriverId) {
                store.setTakenByOther(true);
            } else {
                store.setPendingOrder(null);
            }
        }
    }, [availableOrders, orders, currentDriverId]);

    // ── Auto-present (capacity-aware) ──
    // Depends on pendingOrder so after skip/dismiss the next order surfaces immediately.
    const availableOrdersSignature = useMemo(() => {
        return availableOrders
            .map((o) => `${o.id}:${o.status}:${o.estimatedReadyAt ?? ''}:${o.preparingAt ?? ''}:${o.preparationMinutes ?? ''}`)
            .join('|');
    }, [availableOrders]);

    useEffect(() => {
        const store = useOrderAcceptStore.getState();
        if (!networkReady || !isOnline || store.pendingOrder || dispatchModeEnabled) return;
        if (assignedOrders.length >= maxActiveOrders) return;
        const next = availableOrders[0];
        if (!next) return;
        store.setPendingOrder(next, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableOrdersSignature, pendingOrder, networkReady, isOnline, dispatchModeEnabled, assignedOrders.length, maxActiveOrders]);

    const takenByOther = useOrderAcceptStore((s) => s.takenByOther);

    return {
        orders,
        pendingOrder: liveOrder,
        autoCountdown,
        accepting,
        acceptError,
        takenByOther,
        networkReady,
        isOrdersBootstrapping,
        assignedOrders,
        availableOrders,
        poolOrders,
        handleAcceptOrder,
        handleSkipOrder,
        handleAcceptAndNavigate,
    };
}
