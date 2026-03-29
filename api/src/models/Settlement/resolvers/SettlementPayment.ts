import type { SettlementPaymentResolvers } from './../../../generated/types.generated';
import { eq } from 'drizzle-orm';
import { businesses, drivers, users } from '@/database/schema';

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

export const SettlementPayment: SettlementPaymentResolvers = {
    driver: async (payment, _, { db }) => {
        if (!payment.driverId) return null;
        const driver = await db
            .select()
            .from(drivers)
            .leftJoin(users, eq(drivers.userId, users.id))
            .where(eq(drivers.id, payment.driverId))
            .limit(1)
            .then((result) => result?.[0]?.users);
        return driver || null;
    },

    business: async (payment, _, { db }) => {
        if (!payment.businessId) return null;
        const business = await db
            .select()
            .from(businesses)
            .where(eq(businesses.id, payment.businessId))
            .limit(1)
            .then((result) => result?.[0]);
        return business || null;
    },

    createdBy: async (payment, _, { db }) => {
        const userId = (payment as any).createdByUserId;
        if (!userId) return null;
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
            .then((result) => result?.[0]);
        return user || null;
    },

    // Backward-compat: no longer stored in DB
    direction: () => null,
    totalBalanceAtTime: () => null,
    paymentMethod: () => null,
    paymentReference: () => null,

    createdAt: (payment) => normalizeDateValue(payment.createdAt),
} as any;
