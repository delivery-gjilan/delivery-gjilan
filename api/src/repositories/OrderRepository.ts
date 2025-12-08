import { getDB } from '@/database';
import { orders as ordersTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { DbOrder } from '@/database/schema/orders';
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

    async updateStatus(id: string, status: OrderStatus): Promise<DbOrder | null> {
        const db = await getDB();
        const result = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning();
        return result[0] || null;
    }
}

export const orderRepository = new OrderRepository();
