import { type DbType } from '@/database';
import {
    settlementRequests,
    users,
    businesses,
    drivers as driversTable,
} from '@/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { DbSettlementRequest } from '@/database/schema/settlementRequests';

export interface CreateSettlementRequestInput {
    entityType: 'DRIVER' | 'BUSINESS';
    businessId?: string | null;
    driverId?: string | null;
    amount: number;
    note?: string | null;
}

export class SettlementRequestRepository {
    constructor(private db: DbType) {}

    async getById(id: string): Promise<DbSettlementRequest | null> {
        const result = await this.db
            .select()
            .from(settlementRequests)
            .where(eq(settlementRequests.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async getMany(filters: {
        businessId?: string;
        driverId?: string;
        entityType?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<DbSettlementRequest[]> {
        let query = this.db.select().from(settlementRequests).$dynamic();
        const conditions = [];

        if (filters.businessId) {
            conditions.push(eq(settlementRequests.businessId, filters.businessId));
        }
        if (filters.driverId) {
            conditions.push(eq(settlementRequests.driverId, filters.driverId));
        }
        if (filters.entityType) {
            conditions.push(eq(settlementRequests.entityType, filters.entityType as 'DRIVER' | 'BUSINESS'));
        }
        if (filters.status) {
            conditions.push(eq(settlementRequests.status, filters.status as 'PENDING' | 'ACCEPTED' | 'REJECTED'));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        query = query.orderBy(sql`${settlementRequests.createdAt} DESC`);

        if (filters.limit) query = query.limit(filters.limit);
        if (filters.offset) query = query.offset(filters.offset);

        return query;
    }

    async create(input: CreateSettlementRequestInput): Promise<DbSettlementRequest> {
        const result = await this.db
            .insert(settlementRequests)
            .values({
                entityType: input.entityType,
                businessId: input.businessId ?? null,
                driverId: input.driverId ?? null,
                amount: String(input.amount),
                note: input.note ?? null,
                status: 'PENDING',
            })
            .returning();

        return result[0]!;
    }

    async accept(
        requestId: string,
        respondedByUserId: string,
        settlementPaymentId: string,
    ): Promise<DbSettlementRequest> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlementRequests)
            .set({
                status: 'ACCEPTED',
                respondedAt: now,
                respondedByUserId,
                settlementPaymentId,
                updatedAt: now,
            })
            .where(eq(settlementRequests.id, requestId))
            .returning();
        return result[0]!;
    }

    async reject(
        requestId: string,
        respondedByUserId: string,
        reason?: string | null,
    ): Promise<DbSettlementRequest> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlementRequests)
            .set({
                status: 'REJECTED',
                respondedAt: now,
                respondedByUserId,
                reason: reason ?? null,
                updatedAt: now,
            })
            .where(eq(settlementRequests.id, requestId))
            .returning();
        return result[0]!;
    }

    /** Find all users with BUSINESS_OWNER role for a given businessId */
    async findBusinessOwnerUserIds(businessId: string): Promise<string[]> {
        const rows = await this.db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    eq(users.businessId, businessId),
                    eq(users.role, 'BUSINESS_OWNER'),
                ),
            );
        return rows.map((r) => r.id);
    }

    /** Find the user ID for a given driver record ID */
    async findDriverUserId(driverId: string): Promise<string | null> {
        const row = await this.db
            .select({ userId: driversTable.userId })
            .from(driversTable)
            .where(eq(driversTable.id, driverId))
            .limit(1);
        return row[0]?.userId ?? null;
    }
}
