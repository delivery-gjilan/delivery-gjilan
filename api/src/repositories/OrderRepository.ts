import { getDB } from '@/database';
import { orders as ordersTable, orderItems as orderItemsTable } from '@/database/schema';
import { eq, inArray } from 'drizzle-orm';
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

    async updateStatusAndDriver(id: string, status: OrderStatus, driverId: string): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db
            .update(ordersTable)
            .set({ status, driverId })
            .where(eq(ordersTable.id, id))
            .returning();
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
        console.log('ID e userit', userId);
        const db = await getDB();
        const result = await db.query.orders.findMany({
            where: (tbl, { and, eq, notInArray }) =>
                and(eq(tbl.userId, userId), notInArray(tbl.status, ['DELIVERED', 'CANCELLED'] as OrderStatus[])),
            orderBy: (tbl, { asc }) => [asc(tbl.createdAt)],
        });
        console.log('rezultatet', result);
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
