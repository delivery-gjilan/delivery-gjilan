import type { DbType } from '@/database';
type Database = DbType;
import { settlementPayments } from '@/database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { DbSettlementPayment } from '@/database/schema/settlementPayments';

export interface SettlementPaymentFilters {
    entityType?: string;
    driverId?: string;
    businessId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export class SettlementPaymentRepository {
    constructor(private db: Database) {}

    async getById(id: string): Promise<DbSettlementPayment | null> {
        const result = await this.db
            .select()
            .from(settlementPayments)
            .where(eq(settlementPayments.id, id));
        return result[0] ?? null;
    }

    async getPayments(filters: SettlementPaymentFilters): Promise<DbSettlementPayment[]> {
        let query: any = this.db.select().from(settlementPayments);
        const conditions = [];

        if (filters.entityType) {
            conditions.push(eq(settlementPayments.entityType, filters.entityType as any));
        }
        if (filters.driverId) {
            conditions.push(eq(settlementPayments.driverId, filters.driverId));
        }
        if (filters.businessId) {
            conditions.push(eq(settlementPayments.businessId, filters.businessId));
        }
        if (filters.startDate) {
            conditions.push(gte(settlementPayments.createdAt, filters.startDate));
        }
        if (filters.endDate) {
            conditions.push(lte(settlementPayments.createdAt, filters.endDate));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        query = query.orderBy(sql`${settlementPayments.createdAt} DESC`);

        if (filters.limit) query = query.limit(filters.limit);
        if (filters.offset) query = query.offset(filters.offset);

        return query;
    }
}
