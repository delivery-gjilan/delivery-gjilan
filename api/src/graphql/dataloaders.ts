import DataLoader from 'dataloader';
import { DbType } from '@/database';
import { users, DbUser } from '@/database/schema/users';
import { drivers, DbDriver } from '@/database/schema/drivers';
import { orderPromotions, DbOrderPromotion } from '@/database/schema/orderPromotions';
import { inArray, eq } from 'drizzle-orm';

/**
 * Batch-loads users by their IDs.
 * Resolves N+1 in Order.user and anywhere users are fetched per-item.
 */
export function createUserLoader(db: DbType) {
    return new DataLoader<string, DbUser | null>(async (ids) => {
        const rows = await db.select().from(users).where(inArray(users.id, [...ids]));
        const map = new Map(rows.map((r) => [r.id, r]));
        return ids.map((id) => map.get(id) ?? null);
    });
}

/**
 * Batch-loads drivers by userId (not by driver PK).
 * Resolves N+1 in User.isOnline / driverLocation / driverConnection etc.
 */
export function createDriverByUserIdLoader(db: DbType) {
    return new DataLoader<string, DbDriver | null>(async (userIds) => {
        const rows = await db.select().from(drivers).where(inArray(drivers.userId, [...userIds]));
        const map = new Map(rows.map((r) => [r.userId, r]));
        return userIds.map((id) => map.get(id) ?? null);
    });
}

/**
 * Batch-loads order promotions by orderId.
 * Resolves N+1 in Order.orderPromotions field resolver.
 */
export function createOrderPromotionsLoader(db: DbType) {
    return new DataLoader<string, DbOrderPromotion[]>(async (orderIds) => {
        const rows = await db
            .select()
            .from(orderPromotions)
            .where(inArray(orderPromotions.orderId, [...orderIds]));
        const map = new Map<string, DbOrderPromotion[]>();
        for (const row of rows) {
            const arr = map.get(row.orderId) ?? [];
            arr.push(row);
            map.set(row.orderId, arr);
        }
        return orderIds.map((id) => map.get(id) ?? []);
    });
}

export interface DataLoaders {
    userLoader: DataLoader<string, DbUser | null>;
    driverByUserIdLoader: DataLoader<string, DbDriver | null>;
    orderPromotionsLoader: DataLoader<string, DbOrderPromotion[]>;
}

export function createDataLoaders(db: DbType): DataLoaders {
    return {
        userLoader: createUserLoader(db),
        driverByUserIdLoader: createDriverByUserIdLoader(db),
        orderPromotionsLoader: createOrderPromotionsLoader(db),
    };
}
