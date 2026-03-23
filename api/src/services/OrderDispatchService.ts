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

// ── Internals ─────────────────────────────────────────────────────────────────

type DispatchState = {
    firstWaveIds: string[];
    expanded: boolean;
};

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
    /** In-memory map of pending expansion timers, keyed by orderId. */
    private expandTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly db: DbType,
        private readonly driverRepository: DriverRepository,
    ) {}

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

            // 2. Get all eligible (CONNECTED + onlinePreference) drivers with a known location.
            const allDrivers = await this.driverRepository.getAllDrivers();
            const eligible = allDrivers.filter(
                (d) =>
                    d.onlinePreference &&
                    d.connectionStatus === 'CONNECTED' &&
                    d.driverLat != null &&
                    d.driverLng != null,
            );

            if (eligible.length === 0) {
                log.info({ orderId }, 'dispatch:noEligibleDrivers');
                return;
            }

            // 3. Sort by straight-line distance from the pickup point.
            const sorted = eligible
                .map((d) => ({
                    userId: d.userId,
                    distanceKm: haversineKm(d.driverLat!, d.driverLng!, pickup.lat, pickup.lng),
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);

            // 4. Build the first wave: everyone within radius, but at least FIRST_WAVE_MIN_DRIVERS.
            const inRadius = sorted.filter((d) => d.distanceKm <= FIRST_WAVE_RADIUS_KM);
            const firstWave =
                inRadius.length >= FIRST_WAVE_MIN_DRIVERS
                    ? inRadius
                    : sorted.slice(0, Math.min(FIRST_WAVE_MIN_DRIVERS, sorted.length));

            const firstWaveIds = firstWave.map((d) => d.userId);

            log.info(
                {
                    orderId,
                    pickupLat: pickup.lat,
                    pickupLng: pickup.lng,
                    firstWaveCount: firstWaveIds.length,
                    totalEligible: eligible.length,
                    nearestKm: sorted[0]?.distanceKm?.toFixed(2),
                },
                'dispatch:firstWave',
            );

            // 5. Notify wave-1 drivers immediately.
            notifyDriversOrderReady(notificationService, firstWaveIds, orderId, pickup.businessName);

            // 6. If all eligible drivers are already in wave 1, no expansion needed.
            if (firstWaveIds.length >= eligible.length) {
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
     * Cancel a pending wave-2 expansion.
     * Call this as soon as a driver accepts the order.
     */
    cancelDispatch(orderId: string): void {
        const timer = this.expandTimers.get(orderId);
        if (timer) {
            clearTimeout(timer);
            this.expandTimers.delete(orderId);
            log.debug({ orderId }, 'dispatch:cancelled — timer cleared');
        }
        // Clean up Redis state (fire-and-forget).
        cache.del(`dispatch:order:${orderId}`).catch(() => {});
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
        const remaining = allDrivers.filter(
            (d) =>
                d.onlinePreference &&
                d.connectionStatus === 'CONNECTED' &&
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

    /** Notify all currently CONNECTED+willing drivers, excluding a given set. */
    private async _notifyAll(
        orderId: string,
        notificationService: NotificationService,
        excludeIds: string[],
    ): Promise<void> {
        const allDrivers = await this.driverRepository.getAllDrivers();
        const ids = allDrivers
            .filter(
                (d) =>
                    d.onlinePreference &&
                    d.connectionStatus === 'CONNECTED' &&
                    !excludeIds.includes(d.userId),
            )
            .map((d) => d.userId);

        if (ids.length === 0) return;
        notifyDriversOrderReady(notificationService, ids, orderId, undefined);
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
