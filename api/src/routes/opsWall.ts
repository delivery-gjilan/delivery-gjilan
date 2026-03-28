/**
 * GET /health/ops-wall
 *
 * Unified monitoring endpoint aggregating driver fleet, business device fleet,
 * order pipeline, and realtime connection health into a single JSON payload.
 *
 * Polled by the admin-panel Ops Wall page every 10 seconds.
 * Auth required: SUPER_ADMIN or ADMIN role.
 */

import { Router, type Request, type Response } from 'express';
import { desc, eq, and, isNotNull, inArray, sql } from 'drizzle-orm';
import { getDB } from '../../database';
import { drivers as driversTable } from '../../database/schema/drivers';
import { orders as ordersTable } from '../../database/schema/orders';
import {
    businessDeviceHealth as businessDeviceHealthTable,
    notifications as notificationsTable,
    pushTelemetryEvents as pushTelemetryEventsTable,
} from '../../database/schema/notifications';
import { businesses as businessesTable } from '../../database/schema/businesses';
import { users as usersTable } from '../../database/schema/users';
import { realtimeMonitor } from '@/lib/realtimeMonitoring';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import {
    driversByConnectionStatusGauge,
    businessDevicesByOnlineStatusGauge,
    ordersByStatusGauge,
    ordersStuckGauge,
} from '@/lib/metrics';
import logger from '@/lib/logger';

const log = logger.child({ service: 'OpsWallRoute' });

// ── Stuck-order thresholds ────────────────────────────────────────
const PENDING_STUCK_MINUTES = 5;
const READY_STUCK_MINUTES = 3;
const OUT_FOR_DELIVERY_STUCK_MINUTES = 10;

// ── Router ────────────────────────────────────────────────────────

export const opsWallRouter = Router();

function requireAdminOrSuperAdmin(req: Request, res: Response): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }

    try {
        const token = authHeader.slice(7);
        const payload = decodeJwtToken(token);
        if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden' });
            return false;
        }

        return true;
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return false;
    }
}

opsWallRouter.get('/', async (req: Request, res: Response) => {
    if (!requireAdminOrSuperAdmin(req, res)) {
        return;
    }

    try {
        const db = await getDB();
        const now = Date.now();

        // ── Driver fleet ──────────────────────────────────────────
        const [driverStatusCountsRaw, staleLocationResult, avgHeartbeatResult, recentDisconnectsRaw] =
            await Promise.all([
                // Count by connectionStatus
                db
                    .select({
                        status: driversTable.connectionStatus,
                        count: sql<number>`count(*)::int`,
                    })
                    .from(driversTable)
                    .groupBy(driversTable.connectionStatus),

                // Drivers marked CONNECTED but heartbeat is stale (> 60s)
                db
                    .select({ count: sql<number>`count(*)::int` })
                    .from(driversTable)
                    .where(
                        and(
                            eq(driversTable.connectionStatus, 'CONNECTED'),
                            isNotNull(driversTable.lastHeartbeatAt),
                            sql`${driversTable.lastHeartbeatAt} < now() - interval '60 seconds'`,
                        ),
                    ),

                // Average heartbeat age across CONNECTED drivers
                db
                    .select({
                        avgAgeSeconds: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (now() - ${driversTable.lastHeartbeatAt}))), 0)::int`,
                    })
                    .from(driversTable)
                    .where(
                        and(
                            eq(driversTable.connectionStatus, 'CONNECTED'),
                            isNotNull(driversTable.lastHeartbeatAt),
                        ),
                    ),

                // Last 10 disconnected drivers with name + battery
                db
                    .select({
                        driverId: driversTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        phoneNumber: usersTable.phoneNumber,
                        disconnectedAt: driversTable.disconnectedAt,
                        batteryLevel: driversTable.batteryLevel,
                    })
                    .from(driversTable)
                    .innerJoin(usersTable, eq(usersTable.id, driversTable.userId))
                    .where(
                        and(
                            eq(driversTable.connectionStatus, 'DISCONNECTED'),
                            isNotNull(driversTable.disconnectedAt),
                        ),
                    )
                    .orderBy(desc(driversTable.disconnectedAt))
                    .limit(10),
            ]);

        const byConnectionStatus: Record<string, number> = {
            CONNECTED: 0,
            STALE: 0,
            LOST: 0,
            DISCONNECTED: 0,
        };
        let totalDrivers = 0;
        for (const row of driverStatusCountsRaw) {
            byConnectionStatus[row.status] = row.count;
            totalDrivers += row.count;
        }

        // Update Prometheus gauges
        for (const [status, count] of Object.entries(byConnectionStatus)) {
            driversByConnectionStatusGauge.set({ status }, count);
        }

        const driverFleet = {
            total: totalDrivers,
            byConnectionStatus,
            staleLocationCount: staleLocationResult[0]?.count ?? 0,
            avgHeartbeatAgeSeconds: avgHeartbeatResult[0]?.avgAgeSeconds ?? 0,
            recentDisconnects: recentDisconnectsRaw.map((d) => ({
                driverId: d.driverId,
                name: `${d.firstName} ${d.lastName}`,
                phoneNumber: d.phoneNumber ?? null,
                disconnectedAt: d.disconnectedAt,
                batteryLevel: d.batteryLevel,
            })),
        };

        // ── Business fleet ────────────────────────────────────────
        // Deduplicate to one row per businessId — the most recent heartbeat.
        // business_device_health already orders by lastHeartbeatAt DESC so the
        // first row for each businessId is the freshest device.
        const allDeviceRowsRaw = await db
            .select({
                id: businessDeviceHealthTable.id,
                businessId: businessDeviceHealthTable.businessId,
                businessName: businessesTable.name,
                businessPhoneNumber: businessesTable.phoneNumber,
                deviceId: businessDeviceHealthTable.deviceId,
                platform: businessDeviceHealthTable.platform,
                appVersion: businessDeviceHealthTable.appVersion,
                batteryLevel: businessDeviceHealthTable.batteryLevel,
                subscriptionAlive: businessDeviceHealthTable.subscriptionAlive,
                lastHeartbeatAt: businessDeviceHealthTable.lastHeartbeatAt,
            })
            .from(businessDeviceHealthTable)
            .innerJoin(businessesTable, eq(businessesTable.id, businessDeviceHealthTable.businessId))
            .orderBy(desc(businessDeviceHealthTable.lastHeartbeatAt));

        // Keep only the latest device row per business
        const seenBusinessIds = new Set<string>();
        const deviceHealthRaw = allDeviceRowsRaw.filter(row => {
            if (seenBusinessIds.has(row.businessId)) return false;
            seenBusinessIds.add(row.businessId);
            return true;
        });

        const byOnlineStatus: Record<string, number> = { ONLINE: 0, STALE: 0, OFFLINE: 0 };
        const byAppVersion: Record<string, number> = {};
        const byPlatform: Record<string, number> = { ios: 0, android: 0 };
        type DeviceEntry = {
            businessId: string;
            businessName: string;
            businessPhoneNumber: string | null;
            deviceId: string;
            onlineStatus: string;
            lastHeartbeatAt: string | null;
            batteryLevel: number | null;
            subscriptionAlive: boolean;
        };
        const allDeviceEntries: DeviceEntry[] = [];

        for (const row of deviceHealthRaw) {
            const lastHeartbeatMs = row.lastHeartbeatAt ? new Date(row.lastHeartbeatAt).getTime() : 0;
            const ageMs = now - lastHeartbeatMs;
            // Heartbeat interval is 30 s — ONLINE: missed 0 beats, STALE: 1-3 missed, OFFLINE: >3 missed
            const onlineStatus = ageMs <= 30_000 ? 'ONLINE' : ageMs <= 90_000 ? 'STALE' : 'OFFLINE';

            byOnlineStatus[onlineStatus] = (byOnlineStatus[onlineStatus] ?? 0) + 1;

            const version = row.appVersion ?? 'unknown';
            byAppVersion[version] = (byAppVersion[version] ?? 0) + 1;

            const platform = row.platform === 'IOS' ? 'ios' : 'android';
            byPlatform[platform] = (byPlatform[platform] ?? 0) + 1;

            allDeviceEntries.push({
                businessId: row.businessId,
                businessName: row.businessName,
                businessPhoneNumber: row.businessPhoneNumber ?? null,
                deviceId: row.deviceId,
                onlineStatus,
                lastHeartbeatAt: row.lastHeartbeatAt,
                batteryLevel: row.batteryLevel,
                subscriptionAlive: row.subscriptionAlive ?? false,
            });
        }

        // Update Prometheus gauges
        for (const [status, count] of Object.entries(byOnlineStatus)) {
            businessDevicesByOnlineStatusGauge.set({ status }, count);
        }

        const totalBusinesses = deviceHealthRaw.length > 0
            ? new Set(deviceHealthRaw.map((d) => d.businessId)).size
            : 0;

        const businessFleet = {
            totalDevices: deviceHealthRaw.length,
            totalBusinesses: deviceHealthRaw.length, // 1 row per business after dedup
            onlineDevices: byOnlineStatus.ONLINE ?? 0,
            byOnlineStatus,
            devices: allDeviceEntries,
            byAppVersion,
            byPlatform,
        };

        // ── Order pipeline ────────────────────────────────────────
        const activeStatuses = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as const;
        const [
            activeOrderCountsRaw,
            todayCompletedRaw,
            pendingTooLongRaw,
            readyTooLongRaw,
            outForDeliveryTooLongRaw,
            avgAssignmentRaw,
            avgDeliveryRaw,
        ] = await Promise.all([
            // Active orders by status
            db
                .select({
                    status: ordersTable.status,
                    count: sql<number>`count(*)::int`,
                })
                .from(ordersTable)
                .where(inArray(ordersTable.status, [...activeStatuses]))
                .groupBy(ordersTable.status),

            // Today's completed orders
            db
                .select({
                    status: ordersTable.status,
                    count: sql<number>`count(*)::int`,
                })
                .from(ordersTable)
                .where(
                    and(
                        inArray(ordersTable.status, ['DELIVERED', 'CANCELLED']),
                        sql`${ordersTable.createdAt} >= CURRENT_DATE`,
                    ),
                )
                .groupBy(ordersTable.status),

            // PENDING too long (no driver assigned yet)
            db
                .select({
                    id: ordersTable.id,
                    displayId: ordersTable.displayId,
                    createdAt: ordersTable.createdAt,
                })
                .from(ordersTable)
                .where(
                    and(
                        eq(ordersTable.status, 'PENDING'),
                        sql`${ordersTable.createdAt} < now() - interval '${sql.raw(String(PENDING_STUCK_MINUTES))} minutes'`,
                    ),
                )
                .orderBy(ordersTable.createdAt)
                .limit(10),

            // READY too long (not picked up)
            db
                .select({
                    id: ordersTable.id,
                    displayId: ordersTable.displayId,
                    readyAt: ordersTable.readyAt,
                })
                .from(ordersTable)
                .where(
                    and(
                        eq(ordersTable.status, 'READY'),
                        isNotNull(ordersTable.readyAt),
                        sql`${ordersTable.readyAt} < now() - interval '${sql.raw(String(READY_STUCK_MINUTES))} minutes'`,
                    ),
                )
                .orderBy(ordersTable.readyAt)
                .limit(10),

            // OUT_FOR_DELIVERY too long
            db
                .select({
                    id: ordersTable.id,
                    displayId: ordersTable.displayId,
                    outForDeliveryAt: ordersTable.outForDeliveryAt,
                })
                .from(ordersTable)
                .where(
                    and(
                        eq(ordersTable.status, 'OUT_FOR_DELIVERY'),
                        isNotNull(ordersTable.outForDeliveryAt),
                        sql`${ordersTable.outForDeliveryAt} < now() - interval '${sql.raw(String(OUT_FOR_DELIVERY_STUCK_MINUTES))} minutes'`,
                    ),
                )
                .orderBy(ordersTable.outForDeliveryAt)
                .limit(10),

            // Average driver assignment lag (last hour)
            db
                .select({
                    avgSeconds: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${ordersTable.driverAssignedAt} - ${ordersTable.createdAt}))), 0)::int`,
                })
                .from(ordersTable)
                .where(
                    and(
                        isNotNull(ordersTable.driverAssignedAt),
                        sql`${ordersTable.driverAssignedAt} >= now() - interval '1 hour'`,
                    ),
                ),

            // Average end-to-end delivery time (last hour)
            db
                .select({
                    avgSeconds: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${ordersTable.deliveredAt} - ${ordersTable.createdAt}))), 0)::int`,
                })
                .from(ordersTable)
                .where(
                    and(
                        eq(ordersTable.status, 'DELIVERED'),
                        isNotNull(ordersTable.deliveredAt),
                        sql`${ordersTable.deliveredAt} >= now() - interval '1 hour'`,
                    ),
                ),
        ]);

        const byStatus: Record<string, number> = {};
        for (const row of activeOrderCountsRaw) {
            byStatus[row.status] = row.count;
        }
        for (const row of todayCompletedRaw) {
            byStatus[row.status] = row.count;
        }

        // Update Prometheus gauges
        for (const [status, count] of Object.entries(byStatus)) {
            ordersByStatusGauge.set({ status }, count);
        }

        const stuckPending = pendingTooLongRaw.map((o) => ({
            orderId: o.id,
            displayId: o.displayId,
            since: o.createdAt,
            minutesWaiting: Math.floor((now - new Date(o.createdAt ?? 0).getTime()) / 60_000),
            type: 'pending_no_assignment' as const,
        }));

        const stuckReady = readyTooLongRaw.map((o) => ({
            orderId: o.id,
            displayId: o.displayId,
            since: o.readyAt,
            minutesWaiting: Math.floor((now - new Date(o.readyAt ?? 0).getTime()) / 60_000),
            type: 'ready_no_pickup' as const,
        }));

        const stuckOutForDelivery = outForDeliveryTooLongRaw.map((o) => ({
            orderId: o.id,
            displayId: o.displayId,
            since: o.outForDeliveryAt,
            minutesWaiting: Math.floor((now - new Date(o.outForDeliveryAt ?? 0).getTime()) / 60_000),
            type: 'out_for_delivery_too_long' as const,
        }));

        const allStuck = [...stuckPending, ...stuckReady, ...stuckOutForDelivery];

        // Update stuck Prometheus gauges
        ordersStuckGauge.set({ type: 'pending_no_assignment' }, stuckPending.length);
        ordersStuckGauge.set({ type: 'ready_no_pickup' }, stuckReady.length);
        ordersStuckGauge.set({ type: 'out_for_delivery_too_long' }, stuckOutForDelivery.length);

        const orderPipeline = {
            byStatus,
            stuckOrders: allStuck,
            avgAssignmentTimeSeconds: avgAssignmentRaw[0]?.avgSeconds ?? 0,
            avgDeliveryTimeSeconds: avgDeliveryRaw[0]?.avgSeconds ?? 0,
            thresholds: {
                pendingStuckMinutes: PENDING_STUCK_MINUTES,
                readyStuckMinutes: READY_STUCK_MINUTES,
                outForDeliveryStuckMinutes: OUT_FOR_DELIVERY_STUCK_MINUTES,
            },
        };

        // ── Realtime ──────────────────────────────────────────────
        const realtimeSummary = realtimeMonitor.getSummary();
        const realtime = {
            status: realtimeSummary.status,
            activeByRole: realtimeSummary.activeByRole,
            activeConnections: realtimeSummary.overview.activeConnections,
            activeSubscriptions: realtimeSummary.overview.activeSubscriptions,
            totalRejectedSubscriptions: realtimeSummary.overview.totalRejectedSubscriptions,
            totalSubscriptionErrors: realtimeSummary.overview.totalSubscriptionErrors,
            totalPubsubFailures: realtimeSummary.overview.totalPubsubFailures,
            subscriptionsByOperation: realtimeSummary.subscriptionsByOperation,
            pubsubByTopic: realtimeSummary.pubsubByTopic,
            recentEvents: realtimeSummary.recentEvents.slice(0, 20),
        };

        // ── Push health ───────────────────────────────────────────
        const [pushSent5mRaw, pushTelemetry5mRaw, pushByAppType1hRaw] = await Promise.all([
            db
                .select({ count: sql<number>`count(*)::int` })
                .from(notificationsTable)
                .where(sql`${notificationsTable.sentAt} >= now() - interval '5 minutes'`),

            db
                .select({
                    eventType: pushTelemetryEventsTable.eventType,
                    count: sql<number>`count(*)::int`,
                })
                .from(pushTelemetryEventsTable)
                .where(sql`${pushTelemetryEventsTable.createdAt} >= now() - interval '5 minutes'`)
                .groupBy(pushTelemetryEventsTable.eventType),

            db
                .select({
                    appType: pushTelemetryEventsTable.appType,
                    eventType: pushTelemetryEventsTable.eventType,
                    count: sql<number>`count(*)::int`,
                })
                .from(pushTelemetryEventsTable)
                .where(sql`${pushTelemetryEventsTable.createdAt} >= now() - interval '1 hour'`)
                .groupBy(pushTelemetryEventsTable.appType, pushTelemetryEventsTable.eventType),
        ]);

        const pushByEvent5m: Record<string, number> = {
            RECEIVED: 0,
            OPENED: 0,
            ACTION_TAPPED: 0,
        };
        for (const row of pushTelemetry5mRaw) {
            pushByEvent5m[row.eventType] = row.count;
        }

        const byAppTypeMap = new Map<string, { received: number; opened: number; actioned: number }>();
        for (const row of pushByAppType1hRaw) {
            const current = byAppTypeMap.get(row.appType) ?? { received: 0, opened: 0, actioned: 0 };
            if (row.eventType === 'RECEIVED') current.received = row.count;
            if (row.eventType === 'OPENED') current.opened = row.count;
            if (row.eventType === 'ACTION_TAPPED') current.actioned = row.count;
            byAppTypeMap.set(row.appType, current);
        }

        const byAppType = [...byAppTypeMap.entries()].map(([appType, counts]) => ({
            appType,
            received: counts.received,
            opened: counts.opened,
            actioned: counts.actioned,
            openRatePct: counts.received > 0 ? Math.round((counts.opened / counts.received) * 100) : 0,
        }));

        const received5m = pushByEvent5m.RECEIVED ?? 0;
        const opened5m = pushByEvent5m.OPENED ?? 0;
        const actioned5m = pushByEvent5m.ACTION_TAPPED ?? 0;

        const pushHealth = {
            sentLast5m: pushSent5mRaw[0]?.count ?? 0,
            byEvent5m: pushByEvent5m,
            openRate5mPct: received5m > 0 ? Math.round((opened5m / received5m) * 100) : 0,
            actionRate5mPct: opened5m > 0 ? Math.round((actioned5m / opened5m) * 100) : 0,
            byAppType,
        };

        // ── Live users (authenticated WS connections) ─────────────
        const activeConns = realtimeMonitor.getActiveConnections();
        const liveUserIds = [...new Set(activeConns.filter(c => c.userId).map(c => c.userId!))];

        const [liveUsersRaw, liveActiveOrdersRaw] = await Promise.all([
            liveUserIds.length === 0 ? [] :
                db.select({
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    phoneNumber: usersTable.phoneNumber,
                    address: usersTable.address,
                    role: usersTable.role,
                    flagColor: usersTable.flagColor,
                    adminNote: usersTable.adminNote,
                }).from(usersTable).where(
                    and(
                        inArray(usersTable.id, liveUserIds),
                        eq(usersTable.role, 'CUSTOMER'),
                    ),
                ),

            liveUserIds.length === 0 ? [] :
                db.select({
                    userId: ordersTable.userId,
                    displayId: ordersTable.displayId,
                    status: ordersTable.status,
                    dropoffAddress: ordersTable.dropoffAddress,
                }).from(ordersTable).where(
                    and(
                        inArray(ordersTable.userId, liveUserIds),
                        inArray(ordersTable.status, ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']),
                    ),
                ),
        ]);

        // Map userId → their active order (take the first one per user)
        type ActiveOrderRow = typeof liveActiveOrdersRaw[number];
        const activeOrderByUser = new Map<string, ActiveOrderRow>();
        for (const o of liveActiveOrdersRaw) {
            if (!activeOrderByUser.has(o.userId)) {
                activeOrderByUser.set(o.userId, o);
            }
        }
        // Map userId → connection metadata (connectedAt)
        const connMetaByUser = new Map(activeConns.filter(c => c.userId).map(c => [c.userId!, c]));

        const liveUsers = liveUsersRaw.map(u => ({
            userId: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            phoneNumber: u.phoneNumber,
            address: u.address,
            role: u.role,
            flagColor: u.flagColor,
            adminNote: u.adminNote,
            connectedSince: connMetaByUser.get(u.id)?.connectedAt ?? null,
            activeOrder: activeOrderByUser.get(u.id) ?? null,
        }));

        // ── Global SLO status ─────────────────────────────────────
        const criticalDriverLost = byConnectionStatus.LOST > 0;
        const criticalPubsubFailure = realtimeSummary.overview.totalPubsubFailures > 0;
        const criticalSubscriptionErrors = realtimeSummary.overview.totalSubscriptionErrors > 0;
        const criticalStuckOrders = allStuck.length > 3;

        const degradedDriverStale = byConnectionStatus.STALE > 0;
        const degradedOfflineDevices =
            byOnlineStatus.OFFLINE > 0 &&
            byOnlineStatus.OFFLINE / Math.max(deviceHealthRaw.length, 1) < 0.2;
        const degradedRejectedSubs = realtimeSummary.overview.totalRejectedSubscriptions >= 5;
        const degradedStuckOrders = allStuck.length > 0 && allStuck.length <= 3;

        const isCritical =
            criticalDriverLost ||
            criticalPubsubFailure ||
            criticalSubscriptionErrors ||
            criticalStuckOrders;

        const isDegraded =
            !isCritical &&
            (degradedDriverStale ||
                degradedOfflineDevices ||
                degradedRejectedSubs ||
                degradedStuckOrders);

        const sloStatus: 'ok' | 'degraded' | 'critical' = isCritical
            ? 'critical'
            : isDegraded
              ? 'degraded'
              : 'ok';

        const response = {
            timestamp: new Date().toISOString(),
            sloStatus,
            driverFleet,
            businessFleet,
            orderPipeline,
            realtime,
            liveUsers,
            pushHealth,
        };

        res.status(200).json(response);
    } catch (err) {
        log.error({ err }, 'ops-wall:error — failed to build ops wall payload');
        res.status(500).json({ error: 'Failed to fetch ops wall data' });
    }
});
