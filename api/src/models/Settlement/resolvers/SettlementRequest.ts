import type { SettlementRequestResolvers } from './../../../generated/types.generated';

const normalizeDate = (v: string | Date | null | undefined): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v.toString().replace(' ', 'T').replace(/\+00\.?$/, 'Z'));
    return isNaN(d.getTime()) ? null : d;
};

export const SettlementRequest: SettlementRequestResolvers = {
    entityType: (req) => (req as any).entityType ?? 'BUSINESS',

    business: async (req, _, { loaders }) => {
        if (!req.businessId) return null;
        return loaders.businessByIdLoader.load(req.businessId) as any;
    },

    driver: async (req, _, { db }) => {
        const driverId = (req as any).driverId;
        if (!driverId) return null;
        const { drivers: driversTable } = await import('@/database/schema');
        const { eq } = await import('drizzle-orm');
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.id, driverId),
        });
        if (!driverRecord?.userId) return null;
        const { users } = await import('@/database/schema');
        const user = await db.query.users.findFirst({
            where: eq(users.id, driverRecord.userId),
        });
        return user ?? null;
    },

    respondedBy: async (req, _, { loaders }) => {
        if (!req.respondedByUserId) return null;
        return loaders.userLoader.load(req.respondedByUserId) as any;
    },

    settlementPayment: async (req, _, { db }) => {
        const paymentId = (req as any).settlementPaymentId;
        if (!paymentId) return null;
        const { settlementPayments } = await import('@/database/schema');
        const { eq } = await import('drizzle-orm');
        const result = await db
            .select()
            .from(settlementPayments)
            .where(eq(settlementPayments.id, paymentId))
            .limit(1);
        return result[0] ?? null;
    },

    respondedAt: (req) => normalizeDate(req.respondedAt ?? null),
    createdAt: (req) => normalizeDate(req.createdAt),
    updatedAt: (req) => normalizeDate(req.updatedAt),
} as any;
