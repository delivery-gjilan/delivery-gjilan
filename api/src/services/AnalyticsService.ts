import { getDB } from '@/database';
import { sql } from 'drizzle-orm';

type Row = Record<string, unknown>;

/** Normalize the union return type of db.execute() across drivers. */
function toRows(result: unknown): Row[] {
    if (Array.isArray(result)) return result as Row[];
    if (result != null && typeof result === 'object' && 'rows' in result) {
        return (result as { rows: Row[] }).rows;
    }
    return [];
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

// ─── Operational KPIs ────────────────────────────────────────────────────────

export interface OperationalKPIs {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    cancellationRate: number;
    gmv: number;
    aov: number;
    avgDeliveryTimeMin: number | null;
    avgPrepTimeMin: number | null;
    prepOverrunRate: number | null;
    avgDriverWaitAtPickupMin: number | null;
    fakeReadyRate: number | null;
    dailyVolume: DayVolume[];
}

export interface DayVolume {
    date: string;
    orderCount: number;
    revenue: number;
}

// ─── Business KPIs ────────────────────────────────────────────────────────────

export interface BusinessKPI {
    businessId: string;
    businessName: string;
    totalOrders: number;
    completedOrders: number;
    cancellationRate: number;
    avgPrepTimeMin: number | null;
    p90PrepTimeMin: number | null;
    prepOverrunRate: number | null;
    prematureReadyRate: number | null;
    avgDriverWaitMin: number | null;
    fakeReadyCount: number;
    fakeReadyRate: number | null;
}

// ─── Driver KPIs ──────────────────────────────────────────────────────────────

export interface DriverKPI {
    driverId: string;
    driverName: string;
    totalDeliveries: number;
    avgDeliveryTimeMin: number | null;
    avgPickupTimeMin: number | null;
    avgWaitAtPickupMin: number | null;
}

// ─── Peak Hour Analysis ───────────────────────────────────────────────────────

export interface HourlyDistribution {
    hour: number;
    orderCount: number;
    revenue: number;
    avgDeliveryTimeMin: number | null;
}

export interface DayOfWeekDistribution {
    dow: number;
    orderCount: number;
    revenue: number;
}

export interface PeakHourAnalysis {
    hourly: HourlyDistribution[];
    byDayOfWeek: DayOfWeekDistribution[];
    peakHour: number;
    peakDow: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AnalyticsService {
    async getOperationalKPIs(range: DateRange, businessId?: string): Promise<OperationalKPIs> {
        const db = await getDB();

        // Filter orders that belong to a specific business via products.business_id
        const businessFilter = businessId
            ? sql`AND EXISTS (
                SELECT 1 FROM order_items oi
                INNER JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id AND p.business_id = ${businessId}
              )`
            : sql``;

        const summaryResult = await db.execute(sql`
            SELECT
                COUNT(DISTINCT o.id)::int                                                   AS total_orders,
                COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'DELIVERED')::int             AS completed_orders,
                COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'CANCELLED')::int             AS cancelled_orders,
                ROUND(
                    100.0 * COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'CANCELLED')
                    / NULLIF(COUNT(DISTINCT o.id), 0), 2
                )                                                                           AS cancellation_rate,
                COALESCE(SUM(o.price + o.delivery_price) FILTER (WHERE o.status = 'DELIVERED'), 0) AS gmv,
                ROUND(
                    AVG(o.price + o.delivery_price) FILTER (WHERE o.status = 'DELIVERED'), 2
                )                                                                           AS aov,
                ROUND(
                    AVG(
                        EXTRACT(EPOCH FROM (o.delivered_at::timestamptz - o.order_date::timestamptz)) / 60
                    ) FILTER (WHERE o.status = 'DELIVERED' AND o.delivered_at IS NOT NULL AND o.order_date IS NOT NULL), 2
                )                                                                           AS avg_delivery_time_min,
                ROUND(
                    AVG(
                        EXTRACT(EPOCH FROM (o.ready_at::timestamptz - o.preparing_at::timestamptz)) / 60
                    ) FILTER (WHERE o.ready_at IS NOT NULL AND o.preparing_at IS NOT NULL), 2
                )                                                                           AS avg_prep_time_min,
                ROUND(
                    100.0
                    * COUNT(*) FILTER (WHERE o.ready_at IS NOT NULL AND o.estimated_ready_at IS NOT NULL AND o.ready_at::timestamptz > o.estimated_ready_at::timestamptz)
                    / NULLIF(COUNT(*) FILTER (WHERE o.estimated_ready_at IS NOT NULL), 0), 2
                )                                                                           AS prep_overrun_rate,
                ROUND(
                    AVG(
                        EXTRACT(EPOCH FROM (o.out_for_delivery_at::timestamptz - o.driver_arrived_at_pickup::timestamptz)) / 60
                    ) FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.out_for_delivery_at IS NOT NULL), 2
                )                                                                           AS avg_driver_wait_at_pickup_min,
                ROUND(
                    100.0
                    * COUNT(*) FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.ready_at IS NOT NULL AND o.driver_arrived_at_pickup::timestamptz < o.ready_at::timestamptz)
                    / NULLIF(COUNT(*) FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL), 0), 2
                )                                                                           AS fake_ready_rate
            FROM orders o
            WHERE o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${businessFilter}
        `);

        const summary = toRows(summaryResult)[0] ?? {};

        const dailyVolumeResult = await db.execute(sql`
            SELECT
                DATE(o.order_date::timestamptz)::text               AS date,
                COUNT(*)::int                                        AS order_count,
                COALESCE(SUM(o.price + o.delivery_price) FILTER (WHERE o.status = 'DELIVERED'), 0) AS revenue
            FROM orders o
            WHERE o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${businessFilter}
            GROUP BY DATE(o.order_date::timestamptz)
            ORDER BY DATE(o.order_date::timestamptz)
        `);
        const dailyVolume: DayVolume[] = toRows(dailyVolumeResult).map((r) => ({
            date: r.date as string,
            orderCount: Number(r.order_count),
            revenue: Number(r.revenue),
        }));

        const s = summary;
        return {
            totalOrders: Number(s.total_orders ?? 0),
            completedOrders: Number(s.completed_orders ?? 0),
            cancelledOrders: Number(s.cancelled_orders ?? 0),
            cancellationRate: Number(s.cancellation_rate ?? 0),
            gmv: Number(s.gmv ?? 0),
            aov: Number(s.aov ?? 0),
            avgDeliveryTimeMin: s.avg_delivery_time_min != null ? Number(s.avg_delivery_time_min) : null,
            avgPrepTimeMin: s.avg_prep_time_min != null ? Number(s.avg_prep_time_min) : null,
            prepOverrunRate: s.prep_overrun_rate != null ? Number(s.prep_overrun_rate) : null,
            avgDriverWaitAtPickupMin: s.avg_driver_wait_at_pickup_min != null ? Number(s.avg_driver_wait_at_pickup_min) : null,
            fakeReadyRate: s.fake_ready_rate != null ? Number(s.fake_ready_rate) : null,
            dailyVolume,
        };
    }

    async getBusinessKPIs(range: DateRange, businessId?: string): Promise<BusinessKPI[]> {
        const db = await getDB();

        const businessFilter = businessId ? sql`AND b.id = ${businessId}` : sql``;

        const rows = await db.execute(sql`
            SELECT
                b.id                                                                                             AS business_id,
                b.name                                                                                           AS business_name,
                COUNT(DISTINCT o.id)::int                                                                        AS total_orders,
                COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'DELIVERED')::int                                  AS completed_orders,
                ROUND(
                    100.0 * COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'CANCELLED')
                    / NULLIF(COUNT(DISTINCT o.id), 0), 2
                )                                                                                                AS cancellation_rate,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.ready_at::timestamptz - o.preparing_at::timestamptz)) / 60)
                    FILTER (WHERE o.ready_at IS NOT NULL AND o.preparing_at IS NOT NULL), 2
                )                                                                                                AS avg_prep_time_min,
                ROUND(
                    PERCENTILE_CONT(0.9) WITHIN GROUP (
                        ORDER BY CASE
                            WHEN o.ready_at IS NOT NULL AND o.preparing_at IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (o.ready_at::timestamptz - o.preparing_at::timestamptz)) / 60
                            ELSE NULL
                        END
                    )::numeric, 2
                )                                                                                                AS p90_prep_time_min,
                ROUND(
                    100.0
                    * COUNT(*) FILTER (WHERE o.ready_at IS NOT NULL AND o.estimated_ready_at IS NOT NULL AND o.ready_at::timestamptz > o.estimated_ready_at::timestamptz)
                    / NULLIF(COUNT(*) FILTER (WHERE o.estimated_ready_at IS NOT NULL), 0), 2
                )                                                                                                AS prep_overrun_rate,
                ROUND(
                    100.0
                    * COUNT(*) FILTER (
                        WHERE o.ready_at IS NOT NULL AND o.preparing_at IS NOT NULL
                          AND o.preparation_minutes IS NOT NULL
                          AND EXTRACT(EPOCH FROM (o.ready_at::timestamptz - o.preparing_at::timestamptz)) / 60
                              < (o.preparation_minutes * 0.5)
                    )
                    / NULLIF(COUNT(*) FILTER (WHERE o.preparing_at IS NOT NULL), 0), 2
                )                                                                                                AS premature_ready_rate,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.out_for_delivery_at::timestamptz - o.driver_arrived_at_pickup::timestamptz)) / 60)
                    FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.out_for_delivery_at IS NOT NULL), 2
                )                                                                                                AS avg_driver_wait_min,
                COUNT(*) FILTER (
                    WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.ready_at IS NOT NULL
                      AND o.driver_arrived_at_pickup::timestamptz < o.ready_at::timestamptz
                )::int                                                                                           AS fake_ready_count,
                ROUND(
                    100.0
                    * COUNT(*) FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.ready_at IS NOT NULL AND o.driver_arrived_at_pickup::timestamptz < o.ready_at::timestamptz)
                    / NULLIF(COUNT(*) FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL), 0), 2
                )                                                                                                AS fake_ready_rate
            FROM businesses b
            INNER JOIN (
                SELECT DISTINCT p.business_id, oi.order_id
                FROM order_items oi
                INNER JOIN products p ON p.id = oi.product_id
            ) bo ON bo.business_id = b.id
            INNER JOIN orders o ON o.id = bo.order_id
            WHERE o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${businessFilter}
              AND b.deleted_at IS NULL
            GROUP BY b.id, b.name
            ORDER BY total_orders DESC
        `);

        return toRows(rows).map((r) => ({
            businessId: r.business_id as string,
            businessName: r.business_name as string,
            totalOrders: Number(r.total_orders ?? 0),
            completedOrders: Number(r.completed_orders ?? 0),
            cancellationRate: Number(r.cancellation_rate ?? 0),
            avgPrepTimeMin: r.avg_prep_time_min != null ? Number(r.avg_prep_time_min) : null,
            p90PrepTimeMin: r.p90_prep_time_min != null ? Number(r.p90_prep_time_min) : null,
            prepOverrunRate: r.prep_overrun_rate != null ? Number(r.prep_overrun_rate) : null,
            prematureReadyRate: r.premature_ready_rate != null ? Number(r.premature_ready_rate) : null,
            avgDriverWaitMin: r.avg_driver_wait_min != null ? Number(r.avg_driver_wait_min) : null,
            fakeReadyCount: Number(r.fake_ready_count ?? 0),
            fakeReadyRate: r.fake_ready_rate != null ? Number(r.fake_ready_rate) : null,
        }));
    }

    async getDriverKPIs(range: DateRange, driverId?: string): Promise<DriverKPI[]> {
        const db = await getDB();

        const driverFilter = driverId ? sql`AND o.driver_id = ${driverId}::uuid` : sql``;

        const rows = await db.execute(sql`
            SELECT
                u.id                                                                                              AS driver_id,
                CONCAT(u.first_name, ' ', u.last_name)                                                           AS driver_name,
                COUNT(o.id) FILTER (WHERE o.status = 'DELIVERED')::int                                           AS total_deliveries,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.delivered_at::timestamptz - o.out_for_delivery_at::timestamptz)) / 60)
                    FILTER (WHERE o.status = 'DELIVERED' AND o.delivered_at IS NOT NULL AND o.out_for_delivery_at IS NOT NULL), 2
                )                                                                                                 AS avg_delivery_time_min,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.out_for_delivery_at::timestamptz - o.driver_assigned_at::timestamptz)) / 60)
                    FILTER (WHERE o.out_for_delivery_at IS NOT NULL AND o.driver_assigned_at IS NOT NULL), 2
                )                                                                                                 AS avg_pickup_time_min,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.out_for_delivery_at::timestamptz - o.driver_arrived_at_pickup::timestamptz)) / 60)
                    FILTER (WHERE o.driver_arrived_at_pickup IS NOT NULL AND o.out_for_delivery_at IS NOT NULL), 2
                )                                                                                                 AS avg_wait_at_pickup_min
            FROM users u
            INNER JOIN orders o ON o.driver_id = u.id
            WHERE u.role = 'DRIVER'
              AND o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${driverFilter}
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY total_deliveries DESC
        `);

        return toRows(rows).map((r) => ({
            driverId: r.driver_id as string,
            driverName: r.driver_name as string,
            totalDeliveries: Number(r.total_deliveries ?? 0),
            avgDeliveryTimeMin: r.avg_delivery_time_min != null ? Number(r.avg_delivery_time_min) : null,
            avgPickupTimeMin: r.avg_pickup_time_min != null ? Number(r.avg_pickup_time_min) : null,
            avgWaitAtPickupMin: r.avg_wait_at_pickup_min != null ? Number(r.avg_wait_at_pickup_min) : null,
        }));
    }

    async getPeakHourAnalysis(range: DateRange, businessId?: string): Promise<PeakHourAnalysis> {
        const db = await getDB();
        const businessFilter = businessId
            ? sql`AND EXISTS (
                SELECT 1 FROM order_items oi
                INNER JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id AND p.business_id = ${businessId}
              )`
            : sql``;

        const hourlyRows = await db.execute(sql`
            SELECT
                EXTRACT(HOUR FROM o.order_date::timestamptz)::int                AS hour,
                COUNT(DISTINCT o.id)::int                                         AS order_count,
                COALESCE(SUM(o.price + o.delivery_price) FILTER (WHERE o.status = 'DELIVERED'), 0) AS revenue,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (o.delivered_at::timestamptz - o.order_date::timestamptz)) / 60)
                    FILTER (WHERE o.status = 'DELIVERED' AND o.delivered_at IS NOT NULL), 2
                )                                                                 AS avg_delivery_time_min
            FROM orders o
            WHERE o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${businessFilter}
            GROUP BY EXTRACT(HOUR FROM o.order_date::timestamptz)
            ORDER BY hour
        `);

        const dowRows = await db.execute(sql`
            SELECT
                EXTRACT(DOW FROM o.order_date::timestamptz)::int                  AS dow,
                COUNT(DISTINCT o.id)::int                                          AS order_count,
                COALESCE(SUM(o.price + o.delivery_price) FILTER (WHERE o.status = 'DELIVERED'), 0) AS revenue
            FROM orders o
            WHERE o.order_date::timestamptz >= ${range.startDate}::timestamptz
              AND o.order_date::timestamptz <  ${range.endDate}::timestamptz
              ${businessFilter}
            GROUP BY EXTRACT(DOW FROM o.order_date::timestamptz)
            ORDER BY dow
        `);

        const hourly: HourlyDistribution[] = toRows(hourlyRows).map((r) => ({
            hour: Number(r.hour),
            orderCount: Number(r.order_count),
            revenue: Number(r.revenue),
            avgDeliveryTimeMin: r.avg_delivery_time_min != null ? Number(r.avg_delivery_time_min) : null,
        }));

        const byDayOfWeek: DayOfWeekDistribution[] = toRows(dowRows).map((r) => ({
            dow: Number(r.dow),
            orderCount: Number(r.order_count),
            revenue: Number(r.revenue),
        }));

        const peakHour = hourly.reduce(
            (best, h) => (h.orderCount > best.orderCount ? h : best),
            { hour: 0, orderCount: 0, revenue: 0, avgDeliveryTimeMin: null },
        ).hour;

        const peakDow = byDayOfWeek.reduce(
            (best, d) => (d.orderCount > best.orderCount ? d : best),
            { dow: 0, orderCount: 0, revenue: 0 },
        ).dow;

        return { hourly, byDayOfWeek, peakHour, peakDow };
    }
}
