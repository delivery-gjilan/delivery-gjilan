import type { SettlementRequestResolvers } from './../../../generated/types.generated';
import { businesses, users, drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

const normalizeDate = (v: string | Date | null | undefined): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v.toString().replace(' ', 'T').replace(/\+00\.?$/, 'Z'));
    return isNaN(d.getTime()) ? null : d;
};

export const SettlementRequest: SettlementRequestResolvers = {
    entityType: (req) => (req as any).entityType ?? 'BUSINESS',

    business: async (req, _, { db }) => {
        if (!req.businessId) return null;
        const result = await db
            .select()
            .from(businesses)
            .where(eq(businesses.id, req.businessId))
            .limit(1);
        return (result[0] as any) ?? null;
    },

    driver: async (req, _, { db }) => {
        const driverId = (req as any).driverId;
        if (!driverId) return null;
        // Join drivers + users to return a User object
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.id, driverId),
        });
        if (!driverRecord?.userId) return null;
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, driverRecord.userId))
            .limit(1);
        return (result[0] as any) ?? null;
    },

    requestedBy: async (req, _, { db }) => {
        if (!req.requestedByUserId) return null;
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, req.requestedByUserId))
            .limit(1);
        return (result[0] as any) ?? null;
    },

    respondedBy: async (req, _, { db }) => {
        if (!req.respondedByUserId) return null;
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, req.respondedByUserId))
            .limit(1);
        return (result[0] as any) ?? null;
    },

    periodStart: (req) => normalizeDate(req.periodStart),
    periodEnd: (req) => normalizeDate(req.periodEnd),
    respondedAt: (req) => normalizeDate(req.respondedAt ?? null),
    expiresAt: (req) => normalizeDate(req.expiresAt),
    createdAt: (req) => normalizeDate(req.createdAt),
    updatedAt: (req) => normalizeDate(req.updatedAt),
} as any;
