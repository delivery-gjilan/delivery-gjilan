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

    driver: async (req, _, { db, loaders }) => {
        const driverId = (req as any).driverId;
        if (!driverId) return null;
        // Load driver to get its userId, then load the user
        const { drivers: driversTable } = await import('@/database/schema');
        const { eq } = await import('drizzle-orm');
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.id, driverId),
        });
        if (!driverRecord?.userId) return null;
        return loaders.userLoader.load(driverRecord.userId) as any;
    },

    requestedBy: async (req, _, { loaders }) => {
        if (!req.requestedByUserId) return null;
        return loaders.userLoader.load(req.requestedByUserId) as any;
    },

    respondedBy: async (req, _, { loaders }) => {
        if (!req.respondedByUserId) return null;
        return loaders.userLoader.load(req.respondedByUserId) as any;
    },

    periodStart: (req) => normalizeDate(req.periodStart),
    periodEnd: (req) => normalizeDate(req.periodEnd),
    respondedAt: (req) => normalizeDate(req.respondedAt ?? null),
    expiresAt: (req) => normalizeDate(req.expiresAt),
    createdAt: (req) => normalizeDate(req.createdAt),
    updatedAt: (req) => normalizeDate(req.updatedAt),
} as any;
