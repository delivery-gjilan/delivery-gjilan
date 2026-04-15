/**
 * DirectDispatchService
 *
 * Handles the "Business Direct Dispatch" feature — allows businesses to
 * request a driver to pick up and deliver an order placed by a customer
 * who called the business directly (outside the platform).
 *
 * Flow:
 *  1. Business checks availability via `checkAvailability(businessId)`.
 *  2. Business submits a dispatch request with delivery address + recipient phone.
 *  3. Service creates a lightweight order (no items, channel=DIRECT_DISPATCH, status=READY).
 *  4. Existing dispatch pipeline fires (Wave 1 → Wave 2) to find the closest driver.
 *  5. On delivery completion, settlements are created per the normal rules.
 *
 * Availability:
 *   A driver is considered available when:
 *   - onlinePreference is true
 *   - connectionStatus is not LOST
 *   - active assigned order count is below maxActiveOrders
 *
 * Background tolerance:
 *   Some drivers temporarily stop heartbeats in the background.
 *   To avoid false negatives, DISCONNECTED drivers are still counted when
 *   their last heartbeat is within a short grace window.
 *   If no such drivers exist, direct dispatch is blocked.
 */

import { eq, and, inArray, sql } from 'drizzle-orm';
import type { DbType } from '@/database';
import { businesses, orders as ordersTable, storeSettings } from '@/database/schema';
import { DriverRepository } from '@/repositories/DriverRepository';
import { OrderRepository } from '@/repositories/OrderRepository';
import logger from '@/lib/logger';

const log = logger.child({ service: 'DirectDispatch' });

export interface DirectDispatchAvailabilityResult {
    available: boolean;
    reason: string | null;
    freeDriverCount: number;
}

export interface CreateDirectDispatchInput {
    businessId: string;
    dropOffLocation: { latitude: number; longitude: number; address: string };
    agreedAmount: number;
    recipientPhone: string;
    recipientName?: string | null;
    driverNotes?: string | null;
}

export class DirectDispatchService {
    private static readonly BACKGROUND_HEARTBEAT_GRACE_MS = 5 * 60 * 1000;

    constructor(
        private readonly db: DbType,
        private readonly driverRepository: DriverRepository,
        private readonly orderRepository: OrderRepository,
    ) {}

    /**
     * Check whether a business can create a direct dispatch order right now.
     */
    async checkAvailability(businessId: string): Promise<DirectDispatchAvailabilityResult> {
        const unavailable = (reason: string): DirectDispatchAvailabilityResult => ({
            available: false,
            reason,
            freeDriverCount: 0,
        });

        // 1. Global feature gate
        const settings = await this.getSettings();
        if (!settings.directDispatchEnabled) {
            return unavailable('Direct dispatch is currently disabled by the platform.');
        }

        // 2. Per-business gate
        const [business] = await this.db
            .select({ directDispatchEnabled: businesses.directDispatchEnabled })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);

        if (!business) {
            return unavailable('Business not found.');
        }
        if (!business.directDispatchEnabled) {
            return unavailable('Direct dispatch is not enabled for this business.');
        }

        // 3. Driver capacity check
        const freeDriverCount = await this.getFreeDriverCount();

        if (freeDriverCount <= 0) {
            return unavailable('No drivers are available at the moment. Please try again later.');
        }

        return { available: true, reason: null, freeDriverCount };
    }

    /**
     * Create a direct dispatch order.
     * Returns the raw DB order row (caller maps to GraphQL type).
     */
    async createOrder(input: CreateDirectDispatchInput, requestingUserId: string) {
        // Re-check availability
        const availability = await this.checkAvailability(input.businessId);
        if (!availability.available) {
            throw new Error(availability.reason ?? 'Direct dispatch is not available.');
        }

        if (!Number.isFinite(input.agreedAmount) || input.agreedAmount <= 0) {
            throw new Error('Agreed amount must be greater than 0.');
        }

        const displayId = this.generateDisplayId();

        const [order] = await this.db
            .insert(ordersTable)
            .values({
                displayId,
                userId: requestingUserId,
                businessId: input.businessId,
                channel: 'DIRECT_DISPATCH',
                recipientPhone: input.recipientPhone,
                recipientName: input.recipientName ?? null,
                basePrice: 0,
                markupPrice: 0,
                actualPrice: 0,
                // For DIRECT_DISPATCH, deliveryPrice represents the fixed agreed fee.
                deliveryPrice: input.agreedAmount,
                prioritySurcharge: 0,
                driverTip: 0,
                paymentCollection: 'CASH_TO_DRIVER',
                status: 'READY',
                dropoffLat: input.dropOffLocation.latitude,
                dropoffLng: input.dropOffLocation.longitude,
                dropoffAddress: input.dropOffLocation.address,
                driverNotes: input.driverNotes ?? null,
                readyAt: new Date().toISOString(),
            })
            .returning();

        log.info(
            {
                orderId: order.id,
                displayId,
                businessId: input.businessId,
                recipientPhone: input.recipientPhone,
                agreedAmount: input.agreedAmount,
            },
            'directDispatch:orderCreated',
        );

        return order;
    }

    // ── Private helpers ──────────────────────────────────────────────

    private async getSettings() {
        const [row] = await this.db
            .select({
                directDispatchEnabled: storeSettings.directDispatchEnabled,
            })
            .from(storeSettings)
            .where(eq(storeSettings.id, 'default'))
            .limit(1);

        return {
            directDispatchEnabled: row?.directDispatchEnabled ?? false,
        };
    }

    /**
     * Count drivers who are currently online and still have capacity.
     */
    private async getFreeDriverCount(): Promise<number> {
        const allDrivers = await this.driverRepository.getAllDrivers();
        const now = Date.now();

        const eligibleDrivers = allDrivers.filter((d) => {
            if (!d.onlinePreference) return false;
            if (d.connectionStatus === 'LOST') return false;
            if (d.connectionStatus === 'CONNECTED' || d.connectionStatus === 'STALE') return true;

            // Background grace: keep recently-active DISCONNECTED drivers available.
            const heartbeatMs = d.lastHeartbeatAt ? new Date(d.lastHeartbeatAt).getTime() : 0;
            return heartbeatMs > 0 && now - heartbeatMs <= DirectDispatchService.BACKGROUND_HEARTBEAT_GRACE_MS;
        });

        // Count active orders per eligible driver
        const activeStatuses = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as const;
        const activeOrders = await this.db
            .select({
                driverId: ordersTable.driverId,
                count: sql<number>`count(*)::int`,
            })
            .from(ordersTable)
            .where(
                and(
                    inArray(ordersTable.status, [...activeStatuses]),
                    sql`${ordersTable.driverId} IS NOT NULL`,
                ),
            )
            .groupBy(ordersTable.driverId);

        const activeCountByDriverUserId = new Map(
            activeOrders.map((r) => [r.driverId, r.count]),
        );

        // A driver is "free" if they have capacity for at least one more order
        const freeDrivers = eligibleDrivers.filter((d) => {
            const active = activeCountByDriverUserId.get(d.userId) ?? 0;
            const max = Number(d.maxActiveOrders ?? 2);
            return active < max;
        });

        return freeDrivers.length;
    }

    private generateDisplayId(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return `DD-${code}`;
    }
}
