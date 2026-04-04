import DataLoader from 'dataloader';
import { DbType } from '@/database';
import { users, DbUser } from '@/database/schema/users';
import { userBehaviors, DbUserBehavior } from '@/database/schema/userBehaviors';
import { drivers, DbDriver } from '@/database/schema/drivers';
import { orderPromotions, DbOrderPromotion } from '@/database/schema/orderPromotions';
import { promotions } from '@/database/schema/promotions';
import { optionGroups, DbOptionGroup } from '@/database/schema/optionGroups';
import { options, DbOption } from '@/database/schema/options';
import { products, DbProduct } from '@/database/schema/products';
import { orderItems, DbOrderItem } from '@/database/schema/orderItems';
import { orderItemOptions, DbOrderItemOption } from '@/database/schema/orderItemOptions';
import { PricingService } from '@/services/PricingService';
import { eq, inArray } from 'drizzle-orm';

/**
 * Batch-loads users by their IDs.
 * Resolves N+1 in Order.user and anywhere users are fetched per-item.
 */
export function createUserLoader(db: DbType) {
    return new DataLoader<string, DbUser | null>(async (ids) => {
        const rows = await db
            .select()
            .from(users)
            .where(inArray(users.id, [...ids]));
        const map = new Map(rows.map((r) => [r.id, r]));
        return ids.map((id) => map.get(id) ?? null);
    });
}

/**
 * Batch-loads user behavior rows by userId.
 * Used for user-level operational context like total order count.
 */
export function createUserBehaviorByUserIdLoader(db: DbType) {
    return new DataLoader<string, DbUserBehavior | null>(async (userIds) => {
        const rows = await db
            .select()
            .from(userBehaviors)
            .where(inArray(userBehaviors.userId, [...userIds]));
        const map = new Map(rows.map((row) => [row.userId, row]));
        return userIds.map((id) => map.get(id) ?? null);
    });
}

/**
 * Batch-loads drivers by userId (not by driver PK).
 * Resolves N+1 in User.isOnline / driverLocation / driverConnection etc.
 */
export function createDriverByUserIdLoader(db: DbType) {
    return new DataLoader<string, DbDriver | null>(async (userIds) => {
        const rows = await db
            .select()
            .from(drivers)
            .where(inArray(drivers.userId, [...userIds]));
        const map = new Map(rows.map((r) => [r.userId, r]));
        return userIds.map((id) => map.get(id) ?? null);
    });
}

export type DbOrderPromotionWithCode = DbOrderPromotion & { promoCode: string | null };

/**
 * Batch-loads order promotions by orderId, including the promotion code.
 * Resolves N+1 in Order.orderPromotions field resolver.
 */
export function createOrderPromotionsLoader(db: DbType) {
    return new DataLoader<string, DbOrderPromotionWithCode[]>(async (orderIds) => {
        const rows = await db
            .select({
                id: orderPromotions.id,
                orderId: orderPromotions.orderId,
                promotionId: orderPromotions.promotionId,
                appliesTo: orderPromotions.appliesTo,
                discountAmount: orderPromotions.discountAmount,
                createdAt: orderPromotions.createdAt,
                updatedAt: orderPromotions.updatedAt,
                promoCode: promotions.code,
            })
            .from(orderPromotions)
            .leftJoin(promotions, eq(promotions.id, orderPromotions.promotionId))
            .where(inArray(orderPromotions.orderId, [...orderIds]));
        const map = new Map<string, DbOrderPromotionWithCode[]>();
        for (const row of rows) {
            const arr = map.get(row.orderId) ?? [];
            arr.push({ ...row, promoCode: row.promoCode ?? null });
            map.set(row.orderId, arr);
        }
        return orderIds.map((id) => map.get(id) ?? []);
    });
}

/**
 * Batch-loads option groups by productId.
 * Resolves N+1 in Product.optionGroups field resolver.
 */
export function createOptionGroupsByProductIdLoader(db: DbType) {
    return new DataLoader<string, DbOptionGroup[]>(async (productIds) => {
        const rows = await db
            .select()
            .from(optionGroups)
            .where(inArray(optionGroups.productId, [...productIds]))
            .orderBy(optionGroups.displayOrder);
        const map = new Map<string, DbOptionGroup[]>();
        for (const row of rows) {
            const arr = map.get(row.productId) ?? [];
            arr.push(row);
            map.set(row.productId, arr);
        }
        return productIds.map((id) => map.get(id) ?? []);
    });
}

/**
 * Batch-loads options by optionGroupId.
 * Resolves N+1 in OptionGroup.options field resolver.
 */
export function createOptionsByOptionGroupIdLoader(db: DbType) {
    return new DataLoader<string, DbOption[]>(async (groupIds) => {
        const rows = await db
            .select()
            .from(options)
            .where(inArray(options.optionGroupId, [...groupIds]))
            .orderBy(options.displayOrder);
        const map = new Map<string, DbOption[]>();
        for (const row of rows) {
            const arr = map.get(row.optionGroupId) ?? [];
            arr.push(row);
            map.set(row.optionGroupId, arr);
        }
        return groupIds.map((id) => map.get(id) ?? []);
    });
}

/**
 * Batch-loads products by variant group ID.
 * Resolves N+1 in Product.variants field resolver.
 */
export function createVariantsByGroupIdLoader(db: DbType) {
    return new DataLoader<string, DbProduct[]>(async (groupIds) => {
        const rows = await db
            .select()
            .from(products)
            .where(inArray(products.groupId, [...groupIds]));
        const map = new Map<string, DbProduct[]>();
        for (const row of rows) {
            if (!row.groupId) continue;
            const arr = map.get(row.groupId) ?? [];
            arr.push(row);
            map.set(row.groupId, arr);
        }
        return groupIds.map((id) => map.get(id) ?? []);
    });
}

/**
 * Batch-loads the effective per-unit customer price for products (markup/night tier + sale discount).
 */
export function createEffectivePriceByProductIdLoader(db: DbType) {
    return new DataLoader<string, number>(async (productIds) => {
        const pricingService = new PricingService(db);
        const timestamp = new Date();
        const priceMap = await pricingService.calculateProductPrices([...productIds], { timestamp });

        return productIds.map((id) => {
            const res = priceMap.get(id);
            if (!res) return new Error(`Product not found: ${id}`);
            return res.finalAppliedPrice;
        });
    });
}

/**
 * Batch-loads order item options by orderItemId.
 * Resolves N+1 in OrderItem.selectedOptions field resolver.
 */
export function createOrderItemOptionsByOrderItemIdLoader(db: DbType) {
    return new DataLoader<string, DbOrderItemOption[]>(async (orderItemIds) => {
        const rows = await db
            .select()
            .from(orderItemOptions)
            .where(inArray(orderItemOptions.orderItemId, [...orderItemIds]));
        const map = new Map<string, DbOrderItemOption[]>();
        for (const row of rows) {
            const arr = map.get(row.orderItemId) ?? [];
            arr.push(row);
            map.set(row.orderItemId, arr);
        }
        return orderItemIds.map((id) => map.get(id) ?? []);
    });
}

/**
 * Batch-loads child order items by parentOrderItemId.
 * Resolves N+1 in OrderItem.childItems field resolver.
 */
export function createChildItemsByParentOrderItemIdLoader(db: DbType) {
    return new DataLoader<string, DbOrderItem[]>(async (parentIds) => {
        const rows = await db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.parentOrderItemId, [...parentIds]));
        const map = new Map<string, DbOrderItem[]>();
        for (const row of rows) {
            if (!row.parentOrderItemId) continue;
            const arr = map.get(row.parentOrderItemId) ?? [];
            arr.push(row);
            map.set(row.parentOrderItemId, arr);
        }
        return parentIds.map((id) => map.get(id) ?? []);
    });
}

export interface DataLoaders {
    userLoader: DataLoader<string, DbUser | null>;
    userBehaviorByUserIdLoader: DataLoader<string, DbUserBehavior | null>;
    driverByUserIdLoader: DataLoader<string, DbDriver | null>;
    orderPromotionsLoader: DataLoader<string, DbOrderPromotionWithCode[]>;
    optionGroupsByProductIdLoader: DataLoader<string, DbOptionGroup[]>;
    optionsByOptionGroupIdLoader: DataLoader<string, DbOption[]>;
    variantsByGroupIdLoader: DataLoader<string, DbProduct[]>;
    effectivePriceByProductIdLoader: DataLoader<string, number>;
    orderItemOptionsByOrderItemIdLoader: DataLoader<string, DbOrderItemOption[]>;
    childItemsByParentOrderItemIdLoader: DataLoader<string, DbOrderItem[]>;
}

export function createDataLoaders(db: DbType): DataLoaders {
    return {
        userLoader: createUserLoader(db),
        userBehaviorByUserIdLoader: createUserBehaviorByUserIdLoader(db),
        driverByUserIdLoader: createDriverByUserIdLoader(db),
        orderPromotionsLoader: createOrderPromotionsLoader(db),
        optionGroupsByProductIdLoader: createOptionGroupsByProductIdLoader(db),
        optionsByOptionGroupIdLoader: createOptionsByOptionGroupIdLoader(db),
        variantsByGroupIdLoader: createVariantsByGroupIdLoader(db),
        effectivePriceByProductIdLoader: createEffectivePriceByProductIdLoader(db),
        orderItemOptionsByOrderItemIdLoader: createOrderItemOptionsByOrderItemIdLoader(db),
        childItemsByParentOrderItemIdLoader: createChildItemsByParentOrderItemIdLoader(db),
    };
}
