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

export function useBackgroundLiveActivity() {
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders as any[]);

    const candidateOrder = useMemo(() => {
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
    }, [activeOrders]);

    const mappedStatus: LiveStatus | null = useMemo(() => {
        if (!candidateOrder?.status) return null;
        if (candidateOrder.status === 'OUT_FOR_DELIVERY') return 'out_for_delivery';
        if (candidateOrder.status === 'PENDING') return 'pending';
        if (candidateOrder.status === 'PREPARING' || candidateOrder.status === 'READY') return 'preparing';
        return null;
    }, [candidateOrder?.status]);

    const businessName =
        candidateOrder?.businesses?.[0]?.business?.name ||
        candidateOrder?.businesses?.find((entry: any) => entry?.business?.name)?.business?.name ||
        'Your order';

    const { startLiveActivity } = useLiveActivity({
        orderId: candidateOrder?.id || '',
        orderDisplayId: candidateOrder?.displayId || '',
        businessName,
        enabled: Boolean(candidateOrder?.id && mappedStatus),
    });

    const buildState = useCallback(() => {
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
    }, [candidateOrder, mappedStatus]);

    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const clearedWhenNoActiveOrderRef = useRef(false);
    const lastSyncedSignatureRef = useRef<string | null>(null);
    /** Timestamp when we first saw OFD without a live ETA — used to delay fallback. */
    const ofdFallbackWaitingSinceRef = useRef<number | null>(null);
    const ofdFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const syncLiveActivity = useCallback(
        (force = false) => {
            if (!candidateOrder?.id) {
                lastSyncedSignatureRef.current = null;
                ofdFallbackWaitingSinceRef.current = null;
                if (ofdFallbackTimerRef.current) {
                    clearTimeout(ofdFallbackTimerRef.current);
                    ofdFallbackTimerRef.current = null;
                }
                return;
            }

            const state = buildState();
            if (!state) {
                return;
            }

            // ── OFD live-ETA gate ──────────────────────────────────────────────
            // When the order just went OFD, driverConnection in the order store is
            // stale (no live navigationPhase/remainingEtaSeconds yet). Starting the
            // LA immediately with "15 min" looks wrong. Instead we wait up to
            // OFD_LIVE_ETA_GRACE_MS for real GPS data before falling back.
            if (mappedStatus === 'out_for_delivery') {
                const liveConnection = candidateOrder.driver?.driverConnection;
                const liveEtaSecondsRaw = Number(liveConnection?.remainingEtaSeconds);
                const hasLiveEta =
                    Number.isFinite(liveEtaSecondsRaw) &&
                    liveEtaSecondsRaw > 0 &&
                    liveConnection?.navigationPhase === 'to_dropoff' &&
                    String(liveConnection?.activeOrderId ?? '') === String(candidateOrder.id);

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
                candidateOrder.id,
                mappedStatus ?? '',
                String(state.estimatedMinutes),
                String(state.phaseInitialMinutes),
                String(state.phaseStartedAt),
            ].join(':');

            if (!force && lastSyncedSignatureRef.current === signature) {
                return;
            }

            lastSyncedSignatureRef.current = signature;
            void startLiveActivity(state);
        },
        [buildState, candidateOrder, mappedStatus, startLiveActivity],
    );

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

    // Clean up any pending OFD fallback timer on unmount.
    useEffect(() => {
        return () => {
            if (ofdFallbackTimerRef.current) {
                clearTimeout(ofdFallbackTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'ios') {
            return;
        }

        if (candidateOrder?.id) {
            clearedWhenNoActiveOrderRef.current = false;
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
