import { getDB } from '@/database';
import { orders as ordersTable, orderItems as orderItemsTable } from '@/database/schema';
import { and, desc, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { DbOrder } from '@/database/schema/orders';
import type { NewDbOrderItem } from '@/database/schema/orderItems';
import { OrderStatus } from '@/generated/types.generated';

export class OrderRepository {
    async findAll(limit = 500, offset = 0): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .orderBy(desc(ordersTable.orderDate))
            .limit(limit)
            .offset(offset);
    }

    async countAll(): Promise<number> {
        const db = await getDB();
        const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
        return row?.count ?? 0;
    }

    async findById(id: string): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
        return result[0] || null;
    }

    async findByStatus(status: OrderStatus, limit = 500, offset = 0): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.status, status))
            .orderBy(desc(ordersTable.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async countByStatus(status: OrderStatus): Promise<number> {
        const db = await getDB();
        const [row] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(ordersTable)
            .where(eq(ordersTable.status, status));
        return row?.count ?? 0;
    }

    async findByStatuses(statuses: OrderStatus[], limit = 100, offset = 0, startDate?: string, endDate?: string): Promise<DbOrder[]> {
        const db = await getDB();
        const conditions = [inArray(ordersTable.status, statuses)];
        if (startDate) conditions.push(sql`${ordersTable.orderDate} >= ${startDate}`);
        if (endDate) conditions.push(sql`${ordersTable.orderDate} <= ${endDate}`);
        return await db
            .select()
            .from(ordersTable)
            .where(and(...conditions))
            .orderBy(desc(ordersTable.orderDate))
            .limit(limit)
            .offset(offset);
    }

    async countByStatuses(statuses: OrderStatus[], startDate?: string, endDate?: string): Promise<number> {
        const db = await getDB();
        const conditions = [inArray(ordersTable.status, statuses)];
        if (startDate) conditions.push(sql`${ordersTable.orderDate} >= ${startDate}`);
        if (endDate) conditions.push(sql`${ordersTable.orderDate} <= ${endDate}`);
        const [row] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(ordersTable)
            .where(and(...conditions));
        return row?.count ?? 0;
    }

    async findByIds(ids: string[]): Promise<DbOrder[]> {
        if (ids.length === 0) return [];
        const db = await getDB();
        return await db.select().from(ordersTable).where(inArray(ordersTable.id, ids));
    }

    async findByUserId(userId: string, limit = 100, offset = 0): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.userId, userId))
            .orderBy(desc(ordersTable.orderDate))
            .limit(limit)
            .offset(offset);
    }

    async findActiveByUserId(userId: string): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .where(
                and(
                    eq(ordersTable.userId, userId),
                    notInArray(ordersTable.status, ['DELIVERED', 'CANCELLED'] as OrderStatus[])
                )
            )
            .orderBy(desc(ordersTable.createdAt));
    }

    async findByUserIdAndStatus(userId: string, status: OrderStatus): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .where(and(eq(ordersTable.userId, userId), eq(ordersTable.status, status)))
            .orderBy(desc(ordersTable.createdAt));
    }

    /**
     * Orders visible to a driver: assigned to them OR still active (pickable).
     * Limited to avoid unbounded growth as historical orders accumulate.
     */
    async findForDriver(driverId: string, limit = 200): Promise<DbOrder[]> {
        const db = await getDB();
        return await db
            .select()
            .from(ordersTable)
            .where(
                or(
                    and(
                        eq(ordersTable.status, 'DELIVERED' as OrderStatus),
                        eq(ordersTable.driverId, driverId),
                    ),
                    and(
                        notInArray(ordersTable.status, ['DELIVERED', 'CANCELLED'] as OrderStatus[]),
                        or(
                            eq(ordersTable.driverId, driverId),
                            inArray(ordersTable.status, ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as OrderStatus[]),
                        ),
                    ),
                ),
            )
            .orderBy(desc(ordersTable.createdAt))
            .limit(limit);
    }

    async findForDriverByStatus(driverId: string, status: OrderStatus): Promise<DbOrder[]> {
        const db = await getDB();

        // Historical statuses must be scoped to the assigned driver.
        if (status === 'DELIVERED' || status === 'CANCELLED') {
            return await db
                .select()
                .from(ordersTable)
                .where(and(eq(ordersTable.status, status), eq(ordersTable.driverId, driverId)))
                .orderBy(desc(ordersTable.createdAt));
        }

        return await db
            .select()
            .from(ordersTable)
            .where(
                and(
                    eq(ordersTable.status, status),
                    or(
                        eq(ordersTable.driverId, driverId),
                        inArray(ordersTable.status, ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as OrderStatus[]),
                    ),
                ),
            )
            .orderBy(desc(ordersTable.createdAt));
    }

    async updateStatus(id: string, status: OrderStatus): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning();
        return result[0] || null;
    }

    async updateStatusAndDriver(
        id: string,
        status: OrderStatus,
        driverId: string,
        expectedStatus?: OrderStatus,
    ): Promise<DbOrder | null> {
        const db = await getDB();
        const whereClause = expectedStatus
            ? and(
                  eq(ordersTable.id, id),
                  eq(ordersTable.status, expectedStatus),
                  or(isNull(ordersTable.driverId), eq(ordersTable.driverId, driverId)),
              )
            : and(eq(ordersTable.id, id), or(isNull(ordersTable.driverId), eq(ordersTable.driverId, driverId)));

        const result = await db.update(ordersTable).set({
            status,
            driverId,
            ...(status === 'OUT_FOR_DELIVERY' ? { outForDeliveryAt: new Date().toISOString() } : {}),
        }).where(whereClause).returning();
        return result[0] || null;
    }

    async assignDriver(id: string, driverId: string | null, onlyIfUnassigned = false): Promise<DbOrder | null> {
        const db = await getDB();
        const whereClause = onlyIfUnassigned
            ? and(eq(ordersTable.id, id), isNull(ordersTable.driverId))
            : eq(ordersTable.id, id);
        const result = await db
            .update(ordersTable)
            .set({ driverId, ...(driverId ? { driverAssignedAt: new Date().toISOString() } : {}) })
            .where(whereClause)
            .returning();
        return result[0] || null;
    }

    async findUncompletedOrdersByUserId(userId: string): Promise<DbOrder[]> {
        const db = await getDB();
        const result = await db.query.orders.findMany({
            where: (tbl, { and, eq, notInArray }) =>
                and(eq(tbl.userId, userId), notInArray(tbl.status, ['DELIVERED', 'CANCELLED'] as OrderStatus[])),
            orderBy: (tbl, { asc }) => [asc(tbl.createdAt)],
        });
        return result;
    }

    async findUncompleted(): Promise<DbOrder[]> {
        const db = await getDB();
        const result = await db.query.orders.findMany({
            where: (tbl, { notInArray }) =>
                notInArray(tbl.status, ['DELIVERED', 'CANCELLED'] as OrderStatus[]),
            orderBy: (tbl, { asc }) => [asc(tbl.createdAt)],
        });
        return result;
    }

    async startPreparing(
        id: string,
        preparationMinutes: number,
    ): Promise<DbOrder | null> {
        const db = await getDB();
        const now = new Date();
        const estimatedReadyAt = new Date(now.getTime() + preparationMinutes * 60_000);
        const result = await db
            .update(ordersTable)
            .set({
                status: 'PREPARING' as OrderStatus,
                preparationMinutes,
                estimatedReadyAt: estimatedReadyAt.toISOString(),
                preparingAt: now.toISOString(),
            })
            .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'PENDING' as OrderStatus)))
            .returning();
        return result[0] || null;
    }

    async updatePreparationTime(
        id: string,
        preparationMinutes: number,
    ): Promise<DbOrder | null> {
        const db = await getDB();
        // Single UPDATE: compute estimatedReadyAt from preparingAt in SQL, avoiding
        // the previous findById + update round-trip.
        const result = await db
            .update(ordersTable)
            .set({
                preparationMinutes,
                estimatedReadyAt: sql`COALESCE(preparing_at, NOW()) + (${preparationMinutes} || ' minutes')::interval`,
            })
            .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'PREPARING' as OrderStatus)))
            .returning();
        return result[0] || null;
    }

    async updateStatusWithTimestamp(
        id: string,
        status: OrderStatus,
        timestampField: 'readyAt' | 'outForDeliveryAt' | 'deliveredAt',
    ): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db
            .update(ordersTable)
            .set({ status, [timestampField]: new Date().toISOString() })
            .where(eq(ordersTable.id, id))
            .returning();
        return result[0] || null;
    }

    async cancelWithReason(id: string, reason: string): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db
            .update(ordersTable)
            .set({
                status: 'CANCELLED' as OrderStatus,
                cancellationReason: reason,
                cancelledAt: new Date().toISOString(),
            })
            .where(eq(ordersTable.id, id))
            .returning();
        return result[0] || null;
    }

    async create(
        orderData: typeof ordersTable.$inferInsert,
        itemsData: Omit<NewDbOrderItem, 'orderId'>[],
    ): Promise<DbOrder | null> {
        if (itemsData.length === 0) {
            return null;
        }
        const db = await getDB();

        return await db.transaction(async (tx) => {
            // Create order
            const [createdOrder] = await tx.insert(ordersTable).values(orderData).returning();

            // Create order items
            if (createdOrder) {
                const itemsWithOrderId = itemsData.map((item) => ({
                    ...item,
                    orderId: createdOrder.id,
                }));
                await tx.insert(orderItemsTable).values(itemsWithOrderId);
                return createdOrder;
            } else {
                return null;
            }
        });
    }
}

export const orderRepository = new OrderRepository();
