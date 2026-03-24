import type { SettlementResolvers } from './../../../generated/types.generated';
import { eq } from 'drizzle-orm';
import { businesses, drivers, users, settlementPayments } from '@/database/schema';

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
        if (!settlement.orderId) return null;
        const order = await orderService.getOrderById(String(settlement.orderId));
        return order || null;
    },

    isSettled: (settlement) => {
        return (settlement as any).isSettled ?? false;
    },

    settlementPayment: async (settlement, _, { db }) => {
        const paymentId = (settlement as any).settlementPaymentId;
        if (!paymentId) return null;
        const result = await db
            .select()
            .from(settlementPayments)
            .where(eq(settlementPayments.id, paymentId))
            .limit(1);
        return result[0] ?? null;
    },

    sourcePayment: async (settlement, _, { db }) => {
        const paymentId = (settlement as any).sourcePaymentId;
        if (!paymentId) return null;
        const result = await db
            .select()
            .from(settlementPayments)
            .where(eq(settlementPayments.id, paymentId))
            .limit(1);
        return result[0] ?? null;
    },

    createdAt: (settlement) => normalizeDateValue(settlement.createdAt),
    updatedAt: (settlement) => normalizeDateValue(settlement.updatedAt),
    paidAt: (settlement) => normalizeDateValue(settlement.paidAt ?? null),
} as any;
