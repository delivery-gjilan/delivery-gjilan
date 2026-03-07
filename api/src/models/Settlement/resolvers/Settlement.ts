// @ts-nocheck
import type { SettlementResolvers } from './../../../generated/types.generated';
import { eq } from 'drizzle-orm';
import { businesses, drivers, users } from '@/database/schema';
import { AppError } from '@/lib/errors';

const normalizeDateValue = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;

    const normalized = value
        .replace(' ', 'T')
        .replace(/\+00\.?$/, 'Z')
        .replace(/Z\.$/, 'Z');
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? null : parsed;
};

export const Settlement: SettlementResolvers = {
    driver: async (settlement, _, { db }) => {
        if (!settlement.driverId) return null;
        const driver = await db
            .select()
            .from(drivers)
            .leftJoin(users, eq(drivers.userId, users.id))
            .where(eq(drivers.id, settlement.driverId))
            .limit(1)
            .then((result) => result?.[0]?.users);
        return driver || null;
    },

    business: async (settlement, _, { db }) => {
        if (!settlement.businessId) return null;
        const business = await db
            .select()
            .from(businesses)
            .where(eq(businesses.id, settlement.businessId))
            .limit(1)
            .then((result) => result?.[0]);
        return business || null;
    },
    order: async (settlement, _, { orderService }) => {
        const order = await orderService.getOrderById(String(settlement.orderId));
        if (!order) {
            throw AppError.notFound('Order');
        }
        return order;
    },
    createdAt: (settlement) => normalizeDateValue(settlement.createdAt),
    updatedAt: (settlement) => normalizeDateValue(settlement.updatedAt),
    paidAt: (settlement) => normalizeDateValue(settlement.paidAt ?? null),
};
