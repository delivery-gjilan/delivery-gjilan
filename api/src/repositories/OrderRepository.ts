import { getDB } from '@/database';
import { orders as ordersTable, orderItems as orderItemsTable } from '@/database/schema';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { DbOrder } from '@/database/schema/orders';
import type { NewDbOrderItem } from '@/database/schema/orderItems';
import { OrderStatus } from '@/generated/types.generated';

export class OrderRepository {
    async findAll(): Promise<DbOrder[]> {
        const db = await getDB();
        return await db.select().from(ordersTable);
    }

    async findById(id: string): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
        return result[0] || null;
    }

    async findByStatus(status: OrderStatus): Promise<DbOrder[]> {
        const db = await getDB();
        return await db.select().from(ordersTable).where(eq(ordersTable.status, status));
    }

    async findByIds(ids: string[]): Promise<DbOrder[]> {
        if (ids.length === 0) return [];
        const db = await getDB();
        return await db.select().from(ordersTable).where(inArray(ordersTable.id, ids));
    }

    async findByUserId(userId: string): Promise<DbOrder[]> {
        const db = await getDB();
        return await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
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

    async assignDriver(id: string, driverId: string | null): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db
            .update(ordersTable)
            .set({ driverId })
            .where(eq(ordersTable.id, id))
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
        const order = await this.findById(id);
        if (!order || order.status !== 'PREPARING') return null;

        const preparingAt = order.preparingAt ? new Date(order.preparingAt) : new Date();
        const estimatedReadyAt = new Date(preparingAt.getTime() + preparationMinutes * 60_000);
        const result = await db
            .update(ordersTable)
            .set({
                preparationMinutes,
                estimatedReadyAt: estimatedReadyAt.toISOString(),
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
