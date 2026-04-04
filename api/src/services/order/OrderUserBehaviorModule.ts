import { userBehaviors as userBehaviorsTable } from '@/database/schema';
import { sql } from 'drizzle-orm';
import type { OrderStatus } from '@/generated/types.generated';
import type { OrderServiceDeps } from './types';

export class OrderUserBehaviorModule {
    constructor(private deps: OrderServiceDeps) {}

    async updateUserBehaviorOnStatusChange(
        userId: string,
        fromStatus: OrderStatus,
        toStatus: OrderStatus,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        if (fromStatus === toStatus) return;

        if (toStatus === 'DELIVERED') {
            await this.updateUserBehaviorOnDelivered(userId, orderTotal, orderDate);
            return;
        }

        if (toStatus === 'CANCELLED') {
            await this.updateUserBehaviorOnCancelled(userId, orderDate);
        }
    }

    async updateUserBehaviorOnOrderCreated(userId: string, orderDate: string | null): Promise<void> {
        const db = this.deps.db;
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                totalOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    totalOrders: sql`${userBehaviorsTable.totalOrders} + 1`,
                    lastOrderAt: orderTimestamp,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnDelivered(
        userId: string,
        orderTotal: number,
        orderDate: string | null,
    ): Promise<void> {
        const db = this.deps.db;
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                deliveredOrders: 1,
                totalSpend: orderTotal,
                avgOrderValue: orderTotal,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
                lastDeliveredAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    deliveredOrders: sql`${userBehaviorsTable.deliveredOrders} + 1`,
                    totalSpend: sql`${userBehaviorsTable.totalSpend} + ${orderTotal}`,
                    avgOrderValue: sql`CASE WHEN ${userBehaviorsTable.deliveredOrders} + 1 = 0 THEN 0 ELSE (${userBehaviorsTable.totalSpend} + ${orderTotal}) / (${userBehaviorsTable.deliveredOrders} + 1) END`,
                    lastDeliveredAt: orderTimestamp,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    private async updateUserBehaviorOnCancelled(userId: string, orderDate: string | null): Promise<void> {
        const db = this.deps.db;
        const orderTimestamp = orderDate || new Date().toISOString();

        await db
            .insert(userBehaviorsTable)
            .values({
                userId,
                cancelledOrders: 1,
                firstOrderAt: orderTimestamp,
                lastOrderAt: orderTimestamp,
            })
            .onConflictDoUpdate({
                target: userBehaviorsTable.userId,
                set: {
                    cancelledOrders: sql`${userBehaviorsTable.cancelledOrders} + 1`,
                    lastOrderAt: sql`GREATEST(COALESCE(${userBehaviorsTable.lastOrderAt}, ${orderTimestamp}), ${orderTimestamp})`,
                    firstOrderAt: sql`COALESCE(${userBehaviorsTable.firstOrderAt}, ${orderTimestamp})`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }
}
