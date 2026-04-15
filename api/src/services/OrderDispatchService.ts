/**
 * OrderDispatchService
 *
 * Implements a two-wave driver dispatch flow when an order becomes READY:
 *
 *  Wave 1 (immediate):
 *    - Notify the closest N drivers (within FIRST_WAVE_RADIUS_KM, minimum FIRST_WAVE_MIN_DRIVERS)
 *    - They have ACCEPT_WINDOW_MS to claim the order
 *
 *  Wave 2 (after timeout):
 *    - If the order is still unclaimed, notify ALL remaining CONNECTED drivers
 *
 * Cancellation:
 *    - When a driver accepts the order, cancelDispatch() is called to clear the timer
 *      and remove the Redis state so the expansion never fires.
 */

import { eq } from 'drizzle-orm';
import type { DbType } from '@/database';
import {
    businesses as businessesTable,
    products as productsTable,
    orderItems as orderItemsTable,
} from '@/database/schema';
import { DriverRepository } from '@/repositories/DriverRepository';
import { NotificationService } from '@/services/NotificationService';
import {
    notifyDriversOrderReady,
    notifyDriversOrderExpanded,
} from '@/services/orderNotifications';
import { cache } from '@/lib/cache';
import { SHIFT_DRIVERS_CACHE_KEY } from '@/models/Driver/resolvers/Mutation/adminSetShiftDrivers';
import { getEarlyDispatchQueue } from '@/queues/earlyDispatchQueue';
import { storeSettings } from '@/database/schema/storeSettings';
import { getDB } from '@/database';
import logger from '@/lib/logger';

const log = logger.child({ service: 'OrderDispatch' });

// ── Configuration ─────────────────────────────────────────────────────────────

/** Straight-line radius to include in the first notification wave. */
const FIRST_WAVE_RADIUS_KM = 3;

/**
 * Minimum drivers always included in the first wave even if they are beyond
 * the radius (i.e. the N closest when there are fewer than this many nearby).
 */
const FIRST_WAVE_MIN_DRIVERS = 2;

/** How long wave-1 drivers have to accept before wave 2 is triggered. */
const ACCEPT_WINDOW_MS = 60_000; // 60 seconds

/** Redis TTL for the dispatch state key (generous buffer above ACCEPT_WINDOW_MS). */
const DISPATCH_CACHE_TTL_S = 300; // 5 minutes

/**
 * How many minutes before the estimated ready time to notify drivers.
 * This gives drivers time to travel to the business before the food is ready.
 * If prep time is ≤ this value, dispatch fires immediately on PREPARING.
 *
 * This is the fallback default — the actual value is read from
 * store_settings.early_dispatch_lead_minutes at runtime.
 */
const DEFAULT_EARLY_DISPATCH_LEAD_MIN = 5;

/**
 * Distance threshold (km) beyond which gas vehicles are dispatched first.
 * When the nearest eligible driver is farther than this, gas-vehicle drivers
 * get a head-start before electric drivers are also notified.
 * 0 = disabled. Configurable via store_settings.far_order_threshold_km.
 */
const DEFAULT_FAR_ORDER_THRESHOLD_KM = 5;

/**
 * How many seconds gas drivers get exclusive notification before electric
 * drivers are also notified for far-away orders.
 * Configurable via store_settings.gas_priority_window_seconds.
 */
const DEFAULT_GAS_PRIORITY_WINDOW_S = 30;

// ── Internals ─────────────────────────────────────────────────────────────────

type DispatchState = {
    firstWaveIds: string[];
    expanded: boolean;
    /** IDs notified in gas-priority wave (subset of firstWaveIds). */
    gasPriorityIds?: string[];
    /** Whether the mixed (electric + remaining) follow-up has fired. */
    gasMixedExpanded?: boolean;
};

type EarlyDispatchState = 'pending' | 'fired';

/** Redis TTL for the early dispatch state key. */
const EARLY_DISPATCH_CACHE_TTL_S = 3600; // 1 hour

/** Haversine straight-line distance in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Service ───────────────────────────────────────────────────────────────────

export class OrderDispatchService {
    /** In-memory map of pending wave-2 expansion timers, keyed by orderId. */
    private expandTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly db: DbType,
        private readonly driverRepository: DriverRepository,
    ) {}

    /** Read the configured early-dispatch lead time (minutes) from store settings. */
    private async getEarlyDispatchLeadMin(): Promise<number> {
        try {
            const db = await getDB();
            const rows = await db
                .select({ lead: storeSettings.earlyDispatchLeadMinutes })
                .from(storeSettings)
                .where(eq(storeSettings.id, 'default'))
                .limit(1);
            return rows[0]?.lead ?? DEFAULT_EARLY_DISPATCH_LEAD_MIN;
        } catch {
            return DEFAULT_EARLY_DISPATCH_LEAD_MIN;
        }
    }

    /** Read gas-priority dispatch settings from store_settings. */
    private async getGasPrioritySettings(): Promise<{ thresholdKm: number; windowSeconds: number }> {
        try {
            const db = await getDB();
            const rows = await db
                .select({
                    thresholdKm: storeSettings.farOrderThresholdKm,
                    windowSeconds: storeSettings.gasPriorityWindowSeconds,
                })
                .from(storeSettings)
                .where(eq(storeSettings.id, 'default'))
                .limit(1);
            return {
                thresholdKm: rows[0]?.thresholdKm ?? DEFAULT_FAR_ORDER_THRESHOLD_KM,
                windowSeconds: rows[0]?.windowSeconds ?? DEFAULT_GAS_PRIORITY_WINDOW_S,
            };
        } catch {
            return { thresholdKm: DEFAULT_FAR_ORDER_THRESHOLD_KM, windowSeconds: DEFAULT_GAS_PRIORITY_WINDOW_S };
        }
    }

    /**
     * Schedule driver dispatch to fire earlyDispatchLeadMinutes before the
     * estimated ready time.  Call this immediately after `startPreparing` is saved.
     *
     * - If preparationMinutes ≤ earlyDispatchLeadMinutes: dispatch fires immediately.
     * - Otherwise: a BullMQ delayed job fires (preparationMinutes - leadMin)
     *   minutes from now.  Jobs are persisted in Redis and survive process restarts.
     *
     * Job ID `early-dispatch:<orderId>` deduplicates — re-calling this (e.g. on reschedule)
     * replaces the existing pending job automatically.
     */
    async scheduleEarlyDispatch(
        orderId: string,
        preparationMinutes: number,
        notificationService: NotificationService,
    ): Promise<void> {
        const leadMin = await this.getEarlyDispatchLeadMin();
        const delayMs = Math.max(0, (preparationMinutes - leadMin) * 60_000);

        if (delayMs === 0) {
            log.info({ orderId }, 'earlyDispatch:immediate');
            await cache.set(`dispatch:early:${orderId}`, 'fired' as EarlyDispatchState, EARLY_DISPATCH_CACHE_TTL_S);
            this.dispatchOrder(orderId, notificationService).catch((err) =>
                log.error({ err, orderId }, 'earlyDispatch:immediate:error'),
            );
            return;
        }

        log.info({ orderId, delayMs }, 'earlyDispatch:scheduled');
        await cache.set(`dispatch:early:${orderId}`, 'pending' as EarlyDispatchState, EARLY_DISPATCH_CACHE_TTL_S);

        const q = getEarlyDispatchQueue();
        // Remove any existing pending job for this order before adding the new one.
        const existing = await q.getJob(`early-dispatch-${orderId}`);
        if (existing) await existing.remove().catch(() => {});

        await q.add(
            'early-dispatch',
            { orderId },
            {
                jobId: `early-dispatch-${orderId}`,
                delay: delayMs,
            },
        );
    }

    /**
     * Reschedule the early dispatch for an order whose prep time changed mid-PREPARING.
     *
     * @param orderId
     * @param preparingAtMs  Timestamp (ms) when the order entered PREPARING.
     * @param newPreparationMinutes  Updated prep time in minutes.
     * @param notificationService
     */
    async rescheduleEarlyDispatch(
        orderId: string,
        preparingAtMs: number,
        newPreparationMinutes: number,
        notificationService: NotificationService,
    ): Promise<void> {
        const leadMin = await this.getEarlyDispatchLeadMin();
        const fireAt = preparingAtMs + Math.max(0, newPreparationMinutes - leadMin) * 60_000;
        const delayMs = Math.max(0, fireAt - Date.now());
        const preparationMinutesFromNow = delayMs / 60_000 + leadMin;

        log.info({ orderId, newPreparationMinutes, delayMs }, 'earlyDispatch:rescheduled');
        await this.scheduleEarlyDispatch(orderId, preparationMinutesFromNow, notificationService);
    }

    /**
     * Dispatch an order that just became READY.
     *
     * @param orderId            The order to dispatch.
     * @param notificationService The notification service from the request context.
     */
    async dispatchOrder(orderId: string, notificationService: NotificationService): Promise<void> {
        try {
            // 1. Look up the pickup location (first business on the order).
            const pickup = await this._getPickupCoords(orderId);
            if (!pickup) {
                // No business coordinates — fall back to notifying all connected drivers.
                log.warn({ orderId }, 'dispatch:noPickupCoords — broadcasting to all connected drivers');
                await this._notifyAll(orderId, notificationService, []);
                return;
            }

            // 2. Get all eligible drivers.
            //    - "connected": actively CONNECTED with known GPS → participate in proximity sorting.
            //    - "pushOnly": onlinePreference=true but app killed/offline → always get wave-1 push
            //      (they need to open the app to accept anyway, so proximity doesn't matter for them).
            const allDrivers = await this.driverRepository.getAllDrivers();
            const allDriverUserIds = new Set(allDrivers.map((d) => d.userId));
            const shiftIds = await this._getShiftDriverIds(allDriverUserIds);
            const onlineDrivers = allDrivers.filter(
                (d) => d.onlinePreference && (shiftIds === null || shiftIds.has(d.userId)),
            );
            if (shiftIds !== null) {
                log.info({ orderId, shiftSize: shiftIds.size }, 'dispatch:shiftFilter — restricting to on-shift drivers');
            }

            const connected = onlineDrivers.filter(
                (d) =>
                    d.connectionStatus === 'CONNECTED' &&
                    d.driverLat != null &&
                    d.driverLng != null,
            );
            const pushOnly = onlineDrivers.filter(
                (d) => d.connectionStatus !== 'CONNECTED',
            );
            const pushOnlyIds = pushOnly.map((d) => d.userId);

            if (connected.length === 0 && pushOnlyIds.length === 0) {
                log.info({ orderId }, 'dispatch:noEligibleDrivers');
                return;
            }

            // 3. Sort connected drivers by straight-line distance from the pickup point.
            const sorted = connected
                .map((d) => ({
                    userId: d.userId,
                    vehicleType: d.vehicleType,
                    distanceKm: haversineKm(d.driverLat!, d.driverLng!, pickup.lat, pickup.lng),
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);

            // 4. Build the first wave: closest connected drivers + all push-only (offline-online) drivers.
            const inRadius = sorted.filter((d) => d.distanceKm <= FIRST_WAVE_RADIUS_KM);
            const connectedFirstWave =
                inRadius.length >= FIRST_WAVE_MIN_DRIVERS
                    ? inRadius
                    : sorted.slice(0, Math.min(FIRST_WAVE_MIN_DRIVERS, sorted.length));

            const firstWaveIds = [...connectedFirstWave.map((d) => d.userId), ...pushOnlyIds];

            // 4b. Gas-priority check: if the nearest driver is beyond the far-order
            //     threshold, give gas/unset-vehicle drivers a head-start before notifying
            //     electric drivers. Push-only drivers (offline) are always included
            //     in wave 1 regardless of vehicle type since they need to open the app.
            const { thresholdKm: farThreshold, windowSeconds: gasPriorityWindowS } =
                await this.getGasPrioritySettings();
            const isFarOrder = farThreshold > 0 && sorted.length > 0 && sorted[0].distanceKm > farThreshold;

            if (isFarOrder) {
                // Split first-wave connected drivers: gas/null first, electric delayed.
                // vehicleType=null is treated as gas (legacy drivers without the field set).
                const gasWave = connectedFirstWave.filter((d) => d.vehicleType !== 'ELECTRIC');
                const electricWave = connectedFirstWave.filter((d) => d.vehicleType === 'ELECTRIC');

                // Gas priority wave = gas connected drivers + all push-only drivers.
                const gasPriorityIds = [...gasWave.map((d) => d.userId), ...pushOnlyIds];
                const electricDelayedIds = electricWave.map((d) => d.userId);

                log.info(
                    {
                        orderId,
                        dispatchMode: 'gas-priority',
                        pickupLat: pickup.lat,
                        pickupLng: pickup.lng,
                        gasWaveCount: gasWave.length,
                        electricDelayedCount: electricDelayedIds.length,
                        pushOnly: pushOnlyIds.length,
                        totalConnected: connected.length,
                        nearestKm: sorted[0]?.distanceKm?.toFixed(2),
                        gasPriorityWindowS,
                    },
                    'dispatch:firstWave:gasPriority',
                );

                // Notify gas drivers immediately.
                if (gasPriorityIds.length > 0) {
                    notifyDriversOrderReady(notificationService, gasPriorityIds, orderId, pickup.businessName);
                }

                // Persist state so the gas-mixed expansion and wave-2 can check it.
                await cache.set(
                    `dispatch:order:${orderId}`,
                    {
                        firstWaveIds,
                        expanded: false,
                        gasPriorityIds,
                        gasMixedExpanded: false,
                    } as DispatchState,
                    DISPATCH_CACHE_TTL_S,
                );

                // Schedule the mixed follow-up (electric + any remaining) after the gas window.
                const gasTimer = setTimeout(() => {
                    this._expandGasMixed(orderId, notificationService, pickup.businessName).catch((err) =>
                        log.error({ err, orderId }, 'dispatch:gasMixed:error'),
                    );
                }, gasPriorityWindowS * 1000);
                this.expandTimers.set(`gas:${orderId}`, gasTimer);

                // Schedule wave-2 expansion (all remaining after accept window).
                if (connectedFirstWave.length < connected.length) {
                    const timer = setTimeout(() => {
                        this._expandDispatch(orderId, notificationService).catch((err) =>
                            log.error({ err, orderId }, 'dispatch:expand:error'),
                        );
                    }, ACCEPT_WINDOW_MS);
                    this.expandTimers.set(orderId, timer);
                }

                return;
            }

            log.info(
                {
                    orderId,
                    dispatchMode: 'standard',
                    pickupLat: pickup.lat,
                    pickupLng: pickup.lng,
                    connectedFirstWave: connectedFirstWave.length,
                    pushOnly: pushOnlyIds.length,
                    totalFirstWave: firstWaveIds.length,
                    totalConnected: connected.length,
                    nearestKm: sorted[0]?.distanceKm?.toFixed(2),
                },
                'dispatch:firstWave',
            );

            // 5. Notify wave-1 drivers immediately.
            notifyDriversOrderReady(notificationService, firstWaveIds, orderId, pickup.businessName);

            // 6. If all connected drivers are already in wave 1, no expansion needed.
            if (connectedFirstWave.length >= connected.length) {
                return;
            }

            // 7. Persist dispatch state in Redis so the expansion callback can check
            //    whether the order is still unclaimed.
            await cache.set(
                `dispatch:order:${orderId}`,
                { firstWaveIds, expanded: false } as DispatchState,
                DISPATCH_CACHE_TTL_S,
            );

            // 8. Schedule wave-2 expansion.
            const timer = setTimeout(() => {
                this._expandDispatch(orderId, notificationService).catch((err) =>
                    log.error({ err, orderId }, 'dispatch:expand:error'),
                );
            }, ACCEPT_WINDOW_MS);

            this.expandTimers.set(orderId, timer);
        } catch (err) {
            log.error({ err, orderId }, 'dispatch:error');
        }
    }

    /**
     * Cancel a pending wave-2 expansion (and any pending early-dispatch BullMQ job).
     * Call this as soon as a driver accepts the order.
     */
    cancelDispatch(orderId: string): void {
        const timer = this.expandTimers.get(orderId);
        if (timer) {
            clearTimeout(timer);
            this.expandTimers.delete(orderId);
            log.debug({ orderId }, 'dispatch:cancelled — timer cleared');
        }
        // Also clear gas-priority mixed-wave timer if pending.
        const gasTimer = this.expandTimers.get(`gas:${orderId}`);
        if (gasTimer) {
            clearTimeout(gasTimer);
            this.expandTimers.delete(`gas:${orderId}`);
        }
        // Remove the pending BullMQ early-dispatch job (fire-and-forget).
        getEarlyDispatchQueue()
            .getJob(`early-dispatch-${orderId}`)
            .then((job) => job?.remove())
            .catch(() => {});
        // Clean up Redis state (fire-and-forget).
        cache.del(`dispatch:order:${orderId}`).catch(() => {});
        cache.del(`dispatch:early:${orderId}`).catch(() => {});
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async _expandDispatch(
        orderId: string,
        notificationService: NotificationService,
    ): Promise<void> {
        this.expandTimers.delete(orderId);

        // Check whether the order was already claimed (state deleted by cancelDispatch).
        const state = await cache.get<DispatchState>(`dispatch:order:${orderId}`);
        if (!state || state.expanded) {
            log.debug({ orderId }, 'dispatch:expand:skip — order taken or already expanded');
            return;
        }

        const allDrivers = await this.driverRepository.getAllDrivers();
        const allDriverUserIds = new Set(allDrivers.map((d) => d.userId));
        const shiftIds = await this._getShiftDriverIds(allDriverUserIds);
        // Wave 2: all online-preference on-shift drivers not already notified in wave 1.
        // No connectionStatus restriction — push works even if the app is killed.
        const remaining = allDrivers.filter(
            (d) =>
                d.onlinePreference &&
                (shiftIds === null || shiftIds.has(d.userId)) &&
                !state.firstWaveIds.includes(d.userId),
        );

        if (remaining.length === 0) {
            log.info({ orderId }, 'dispatch:expand:noRemainingDrivers');
            return;
        }

        const remainingIds = remaining.map((d) => d.userId);
        log.info({ orderId, count: remainingIds.length }, 'dispatch:expand:wave2');

        notifyDriversOrderExpanded(notificationService, remainingIds, orderId);

        // Mark as expanded so a second call is a no-op.
        await cache.set(
            `dispatch:order:${orderId}`,
            { ...state, expanded: true } as DispatchState,
            DISPATCH_CACHE_TTL_S,
        );
    }

    /**
     * Gas-priority mixed-wave follow-up: notify electric (and any remaining gas)
     * drivers that were delayed during gas-priority dispatch.
     */
    private async _expandGasMixed(
        orderId: string,
        notificationService: NotificationService,
        businessName?: string,
    ): Promise<void> {
        this.expandTimers.delete(`gas:${orderId}`);

        const state = await cache.get<DispatchState>(`dispatch:order:${orderId}`);
        if (!state || state.gasMixedExpanded) {
            log.debug({ orderId }, 'dispatch:gasMixed:skip — order taken or already expanded');
            return;
        }

        // Notify the first-wave drivers that weren't in the gas-priority batch.
        const alreadyNotified = new Set(state.gasPriorityIds ?? []);
        const mixedIds = state.firstWaveIds.filter((id) => !alreadyNotified.has(id));

        if (mixedIds.length > 0) {
            log.info({ orderId, count: mixedIds.length }, 'dispatch:gasMixed:notifying');
            notifyDriversOrderReady(notificationService, mixedIds, orderId, businessName);
        } else {
            log.info({ orderId }, 'dispatch:gasMixed:noElectricDrivers');
        }

        // Mark mixed expansion as done.
        await cache.set(
            `dispatch:order:${orderId}`,
            { ...state, gasMixedExpanded: true } as DispatchState,
            DISPATCH_CACHE_TTL_S,
        );
    }

    /** Notify all willing on-shift drivers (regardless of connection status), excluding a given set. */
    private async _notifyAll(
        orderId: string,
        notificationService: NotificationService,
        excludeIds: string[],
    ): Promise<void> {
        const allDrivers = await this.driverRepository.getAllDrivers();
        const allDriverUserIds = new Set(allDrivers.map((d) => d.userId));
        const shiftIds = await this._getShiftDriverIds(allDriverUserIds);
        const ids = allDrivers
            .filter(
                (d) =>
                    d.onlinePreference &&
                    (shiftIds === null || shiftIds.has(d.userId)) &&
                    !excludeIds.includes(d.userId),
            )
            .map((d) => d.userId);

        if (ids.length === 0) return;
        notifyDriversOrderReady(notificationService, ids, orderId, undefined);
    }

    /**
     * Returns the set of driver userIds currently on shift.
     * If no shift is configured (empty set), returns null — meaning all drivers are eligible.
     */
    private async _getShiftDriverIds(knownDriverUserIds?: Set<string>): Promise<Set<string> | null> {
        const ids = await cache.get<string[]>(SHIFT_DRIVERS_CACHE_KEY);
        if (!ids || ids.length === 0) return null;

        const normalized = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
        if (normalized.length === 0) return null;

        if (!knownDriverUserIds) {
            return new Set(normalized);
        }

        const filtered = normalized.filter((id) => knownDriverUserIds.has(id));

        if (filtered.length === 0) {
            // Defensive fallback: stale shift IDs should not block all dispatches.
            log.warn(
                {
                    cachedShiftCount: normalized.length,
                    knownDriversCount: knownDriverUserIds.size,
                },
                'dispatch:shiftFilter:invalid — no overlap with active drivers, ignoring shift restriction',
            );
            return null;
        }

        if (filtered.length !== normalized.length) {
            log.warn(
                {
                    cachedShiftCount: normalized.length,
                    validShiftCount: filtered.length,
                },
                'dispatch:shiftFilter:pruned — ignoring unknown driver IDs',
            );
        }

        return new Set(filtered);
    }

    /** Fetch the lat/lng + name of the first business attached to this order. */
    private async _getPickupCoords(
        orderId: string,
    ): Promise<{ lat: number; lng: number; businessName: string } | null> {
        try {
            const rows = await this.db
                .select({
                    locationLat: businessesTable.locationLat,
                    locationLng: businessesTable.locationLng,
                    name: businessesTable.name,
                })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .innerJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
                .where(eq(orderItemsTable.orderId, orderId))
                .limit(1);

            const row = rows[0];
            if (!row) return null;

            return { lat: row.locationLat, lng: row.locationLng, businessName: row.name };
        } catch (err) {
            log.error({ err, orderId }, 'dispatch:getPickupCoords:error');
            return null;
        }
    }
}
