import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useLiveActivity } from '@/hooks/useLiveActivity';

const LIVE_ACTIVITY_ELIGIBLE_STATUSES = new Set(['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

/** How long to wait for live GPS ETA before falling back to 15-min default (ms). */
const OFD_LIVE_ETA_GRACE_MS = 15_000;

type LiveStatus = 'pending' | 'preparing' | 'out_for_delivery';

interface DeliveryLiveActivitiesCleanupModule {
    endAllActivities?: () => Promise<void>;
}

const deliveryLiveActivitiesCleanupNative =
    (NativeModules as Record<string, unknown>).DeliveryLiveActivities as
        | DeliveryLiveActivitiesCleanupModule
        | undefined;

function toMs(dateLike?: string | null): number | null {
    if (!dateLike) return null;
    const parsed = Date.parse(dateLike);
    if (Number.isNaN(parsed)) return null;
    return parsed;
}

function getCandidateOrder(activeOrders: any[]) {
    const eligible = activeOrders.filter(
        (order) =>
            order &&
            order.id &&
            typeof order.status === 'string' &&
            LIVE_ACTIVITY_ELIGIBLE_STATUSES.has(order.status),
    );

    if (eligible.length === 0) return null;

    return [...eligible].sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.orderDate || '') || 0;
        const bTime = Date.parse(b.updatedAt || b.orderDate || '') || 0;
        return bTime - aTime;
    })[0];
}

function mapLiveStatus(orderStatus?: string | null): LiveStatus | null {
    if (!orderStatus) return null;
    if (orderStatus === 'OUT_FOR_DELIVERY') return 'out_for_delivery';
    if (orderStatus === 'PENDING') return 'pending';
    if (orderStatus === 'PREPARING' || orderStatus === 'READY') return 'preparing';
    return null;
}

function getBusinessName(order: any): string {
    return (
        order?.businesses?.[0]?.business?.name ||
        order?.businesses?.find((entry: any) => entry?.business?.name)?.business?.name ||
        'Your order'
    );
}

function buildStateForOrder(candidateOrder: any, mappedStatus: LiveStatus | null) {
    if (!candidateOrder || !mappedStatus) return null;

    const nowMs = Date.now();

    const prepTotal = Math.max(1, Number(candidateOrder.preparationMinutes || 15));
    const estimatedReadyAtMs = toMs(candidateOrder.estimatedReadyAt);

    const preparingStartedAtMs = toMs(candidateOrder.preparingAt);
    const pendingStartedAtMs = toMs(candidateOrder.orderDate);
    const outForDeliveryStartedAtMs =
        toMs(candidateOrder.outForDeliveryAt) ?? toMs(candidateOrder.updatedAt);

    const liveConnection = candidateOrder.driver?.driverConnection;
    const liveEtaSecondsRaw = Number(liveConnection?.remainingEtaSeconds);
    const hasLiveDropoffEta =
        Number.isFinite(liveEtaSecondsRaw) &&
        liveEtaSecondsRaw > 0 &&
        liveConnection?.navigationPhase === 'to_dropoff' &&
        String(liveConnection?.activeOrderId ?? '') === String(candidateOrder.id);

    const inferredPrepRemaining = estimatedReadyAtMs
        ? Math.max(0, Math.ceil((estimatedReadyAtMs - nowMs) / 60000))
        : prepTotal;

    if (mappedStatus === 'pending') {
        return {
            driverName: 'Your driver',
            estimatedMinutes: inferredPrepRemaining,
            phaseInitialMinutes: prepTotal,
            phaseStartedAt: pendingStartedAtMs ?? nowMs,
            status: mappedStatus,
        };
    }

    if (mappedStatus === 'preparing') {
        return {
            driverName: 'Your driver',
            estimatedMinutes: inferredPrepRemaining,
            phaseInitialMinutes: prepTotal,
            phaseStartedAt: preparingStartedAtMs ?? nowMs,
            status: mappedStatus,
        };
    }

    const deliveryPhaseStartedAt = outForDeliveryStartedAtMs ?? nowMs;

    if (hasLiveDropoffEta) {
        const liveEtaMinutes = Math.max(1, Math.ceil(liveEtaSecondsRaw / 60));
        const elapsedMinutes = Math.max(0, Math.floor((nowMs - deliveryPhaseStartedAt) / 60000));
        return {
            driverName: 'Your driver',
            estimatedMinutes: liveEtaMinutes,
            phaseInitialMinutes: Math.max(1, liveEtaMinutes + elapsedMinutes),
            phaseStartedAt: deliveryPhaseStartedAt,
            status: mappedStatus,
        };
    }

    const elapsedMinutesFallback = Math.max(0, Math.floor((nowMs - deliveryPhaseStartedAt) / 60000));
    const fallbackInitialMinutes = 15;
    return {
        driverName: 'Your driver',
        estimatedMinutes: Math.max(1, fallbackInitialMinutes - elapsedMinutesFallback),
        phaseInitialMinutes: fallbackInitialMinutes,
        phaseStartedAt: deliveryPhaseStartedAt,
        status: mappedStatus,
    };
}

export function useBackgroundLiveActivity() {
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders as any[]);

    const candidateOrder = useMemo(() => {
        return getCandidateOrder(activeOrders);
    }, [activeOrders]);

    const mappedStatus: LiveStatus | null = useMemo(() => {
        return mapLiveStatus(candidateOrder?.status);
    }, [candidateOrder?.status]);

    const { startLiveActivity } = useLiveActivity({
        orderId: '',
        orderDisplayId: '',
        businessName: '',
        enabled: true,
    });

    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const clearedWhenNoActiveOrderRef = useRef(false);
    const lastSyncedSignatureRef = useRef<string | null>(null);
    /** Timestamp when we first saw OFD without a live ETA — used to delay fallback. */
    const ofdFallbackWaitingSinceRef = useRef<number | null>(null);
    const ofdFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** True once setActiveOrders has been called at least once (query returned). */
    const storeHasLoadedRef = useRef(false);

    const syncLiveActivity = useCallback(
        (force = false) => {
            const storeActiveOrders = useActiveOrdersStore.getState().activeOrders as any[];
            const currentCandidateOrder = getCandidateOrder(storeActiveOrders);
            const currentMappedStatus = mapLiveStatus(currentCandidateOrder?.status);

            if (!currentCandidateOrder?.id || !currentMappedStatus) {
                lastSyncedSignatureRef.current = null;
                ofdFallbackWaitingSinceRef.current = null;
                if (ofdFallbackTimerRef.current) {
                    clearTimeout(ofdFallbackTimerRef.current);
                    ofdFallbackTimerRef.current = null;
                }
                return;
            }

            const state = buildStateForOrder(currentCandidateOrder, currentMappedStatus);
            if (!state) {
                return;
            }

            // ── OFD live-ETA gate ──────────────────────────────────────────────
            // When the order just went OFD, driverConnection in the order store is
            // stale (no live navigationPhase/remainingEtaSeconds yet). Starting the
            // LA immediately with "15 min" looks wrong. Instead we wait up to
            // OFD_LIVE_ETA_GRACE_MS for real GPS data before falling back.
            if (currentMappedStatus === 'out_for_delivery') {
                const liveConnection = currentCandidateOrder.driver?.driverConnection;
                const liveEtaSecondsRaw = Number(liveConnection?.remainingEtaSeconds);
                const hasLiveEta =
                    Number.isFinite(liveEtaSecondsRaw) &&
                    liveEtaSecondsRaw > 0 &&
                    liveConnection?.navigationPhase === 'to_dropoff' &&
                    String(liveConnection?.activeOrderId ?? '') === String(currentCandidateOrder.id);

                if (hasLiveEta) {
                    // Real GPS data is here — clear any pending fallback timer and sync now.
                    ofdFallbackWaitingSinceRef.current = null;
                    if (ofdFallbackTimerRef.current) {
                        clearTimeout(ofdFallbackTimerRef.current);
                        ofdFallbackTimerRef.current = null;
                    }
                } else {
                    // No live ETA yet. Start the grace-period timer on first encounter.
                    if (ofdFallbackWaitingSinceRef.current === null) {
                        ofdFallbackWaitingSinceRef.current = Date.now();
                        // Schedule a forced sync after the grace period so the LA
                        // eventually appears even if GPS never arrives.
                        if (ofdFallbackTimerRef.current) clearTimeout(ofdFallbackTimerRef.current);
                        ofdFallbackTimerRef.current = setTimeout(() => {
                            ofdFallbackTimerRef.current = null;
                            lastSyncedSignatureRef.current = null; // force re-render
                            syncLiveActivity(true);
                        }, OFD_LIVE_ETA_GRACE_MS);
                    }
                    const waited = Date.now() - ofdFallbackWaitingSinceRef.current;
                    if (waited < OFD_LIVE_ETA_GRACE_MS && !force) {
                        // Still within grace period and not a forced call — skip.
                        return;
                    }
                }
            }

            const signature = [
                currentCandidateOrder.id,
                currentMappedStatus,
                String(state.estimatedMinutes),
                String(state.phaseInitialMinutes),
                String(state.phaseStartedAt),
            ].join(':');

            if (!force && lastSyncedSignatureRef.current === signature) {
                return;
            }

            lastSyncedSignatureRef.current = signature;
            void startLiveActivity(state, {
                orderId: String(currentCandidateOrder.id),
                orderDisplayId: String(currentCandidateOrder.displayId ?? ''),
                businessName: getBusinessName(currentCandidateOrder),
                enabled: true,
            });
        },
        [startLiveActivity],
    );

    const syncLiveActivityRef = useRef(syncLiveActivity);
    useEffect(() => {
        syncLiveActivityRef.current = syncLiveActivity;
    }, [syncLiveActivity]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            const previous = appStateRef.current;
            appStateRef.current = nextState;

            const movedToBackground =
                previous === 'active' && (nextState === 'background' || nextState === 'inactive');

            if (movedToBackground) {
                syncLiveActivity(true);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [syncLiveActivity]);

    useEffect(() => {
        // Keep Live Activity synchronized in real-time whenever active-order data changes.
        syncLiveActivity();
    }, [syncLiveActivity]);

    // Background store-change listener: when the app is in the background React
    // doesn't re-render, so the useEffect above won't fire. A Zustand subscribe
    // callback runs outside the render cycle and makes sure every store update
    // (e.g. a status change pushed via Apollo subscription while backgrounded)
    // still triggers a Live Activity sync.
    useEffect(() => {
        const unsub = useActiveOrdersStore.subscribe(() => {
            syncLiveActivityRef.current();
        });
        return unsub;
    }, []);

    // Clean up any pending OFD fallback timer on unmount.
    useEffect(() => {
        return () => {
            if (ofdFallbackTimerRef.current) {
                clearTimeout(ofdFallbackTimerRef.current);
            }
        };
    }, []);

    // Track when the store gets its first real data load so we don't
    // accidentally kill Live Activities before the orders query returns.
    useEffect(() => {
        if (activeOrders.length > 0) {
            storeHasLoadedRef.current = true;
        }
    }, [activeOrders]);

    useEffect(() => {
        if (Platform.OS !== 'ios') {
            return;
        }

        if (candidateOrder?.id) {
            clearedWhenNoActiveOrderRef.current = false;
            return;
        }

        // Don't end activities until the store has loaded at least once —
        // on cold start the store is empty before the orders query resolves.
        if (!storeHasLoadedRef.current) {
            return;
        }

        if (clearedWhenNoActiveOrderRef.current) {
            return;
        }

        clearedWhenNoActiveOrderRef.current = true;
        if (deliveryLiveActivitiesCleanupNative?.endAllActivities) {
            void deliveryLiveActivitiesCleanupNative.endAllActivities().catch(() => {
                clearedWhenNoActiveOrderRef.current = false;
            });
        }
    }, [candidateOrder?.id]);

}
