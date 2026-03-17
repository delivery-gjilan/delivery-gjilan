import { Database } from '@/database';
import { settlements, drivers, businesses, orders as ordersTable } from '@/database/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { DbSettlement } from '@/database/schema/settlements';

export interface SettlementFilters {
    type?: string;
    status?: string;
    driverId?: string;
    businessId?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface SettlementSummaryFilters {
    type?: string;
    driverId?: string;
    businessId?: string;
    startDate?: string;
    endDate?: string;
}

export class SettlementRepository {
    constructor(private db: Database) {}

    async getSettlementById(id: string): Promise<DbSettlement | null> {
        const result = await this.db.select().from(settlements).where(eq(settlements.id, id));
        return result[0] || null;
    }

    async getSettlements(filters: SettlementFilters): Promise<DbSettlement[]> {
        let query: any = this.db.select().from(settlements);
        const conditions = [];

        if (filters.type) {
            conditions.push(eq(settlements.type, filters.type as any));
        }

        if (filters.status) {
            conditions.push(eq(settlements.status, filters.status as any));
        }

        if (filters.driverId) {
            conditions.push(eq(settlements.driverId, filters.driverId));
        }

        if (filters.businessId) {
            conditions.push(eq(settlements.businessId, filters.businessId));
        }

        if (filters.orderId) {
            conditions.push(eq(settlements.orderId, filters.orderId));
        }

        if (filters.startDate) {
            conditions.push(gte(settlements.createdAt, filters.startDate));
        }

        if (filters.endDate) {
            conditions.push(lte(settlements.createdAt, filters.endDate));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        if (filters.offset) {
            query = query.offset(filters.offset);
        }

        return query.orderBy(sql`${settlements.createdAt} DESC`);
    }

    async getSettlementSummary(filters: SettlementSummaryFilters): Promise<any> {
        const conditions = [];

        if (filters.type) {
            conditions.push(eq(settlements.type, filters.type as any));
        }

        if (filters.driverId) {
            conditions.push(eq(settlements.driverId, filters.driverId));
        }

        if (filters.businessId) {
            conditions.push(eq(settlements.businessId, filters.businessId));
        }

        if (filters.startDate) {
            conditions.push(gte(settlements.createdAt, filters.startDate));
        }

        if (filters.endDate) {
            conditions.push(lte(settlements.createdAt, filters.endDate));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const result = await this.db
            .select({
                totalAmount: sql<number>`SUM(CAST(${settlements.amount} AS NUMERIC))::FLOAT`,
                totalPending: sql<number>`SUM(CASE WHEN ${settlements.status} = 'PENDING' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalPaid: sql<number>`SUM(CASE WHEN ${settlements.status} = 'PAID' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalOverdue: sql<number>`SUM(CASE WHEN ${settlements.status} = 'OVERDUE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalReceivable: sql<number>`SUM(CASE WHEN ${settlements.direction} = 'RECEIVABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalPayable: sql<number>`SUM(CASE WHEN ${settlements.direction} = 'PAYABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                count: sql<number>`COUNT(*)::INT`,
                pendingCount: sql<number>`COUNT(CASE WHEN ${settlements.status} = 'PENDING' THEN 1 END)::INT`,
            })
            .from(settlements)
            .where(whereClause)
            .then((result: any[]) => result[0]);

        return {
            totalAmount: result.totalAmount || 0,
            totalPending: result.totalPending || 0,
            totalPaid: result.totalPaid || 0,
            totalOverdue: result.totalOverdue || 0,
            totalReceivable: result.totalReceivable || 0,
            totalPayable: result.totalPayable || 0,
            count: result.count || 0,
            pendingCount: result.pendingCount || 0,
        };
    }

    async getDriverBalance(driverId: string): Promise<any> {
        return this.getSettlementSummary({
            type: 'DRIVER',
            driverId,
        });
    }

    async getBusinessBalance(businessId: string): Promise<any> {
        return this.getSettlementSummary({
            type: 'BUSINESS',
            businessId,
        });
    }

    async createSettlement(
        type: 'DRIVER' | 'BUSINESS',
        driverId: string | null,
        businessId: string | null,
        orderId: string,
        amount: number,
        direction: 'RECEIVABLE' | 'PAYABLE' = 'RECEIVABLE',
        ruleId?: string,
    ): Promise<DbSettlement> {
        const result = await this.db
            .insert(settlements)
            .values({
                type,
                direction,
                driverId,
                businessId,
                orderId,
                amount,
                status: 'PENDING',
                ruleId: ruleId || null,
            })
            .returning();

        return result[0]!;
    }

    async markAsPaid(settlementId: string): Promise<DbSettlement> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlements)
            .set({
                status: 'PAID',
                paidAt: now,
                updatedAt: now,
            })
            .where(eq(settlements.id, settlementId))
            .returning();

        return result[0]!;
    }

    async markMultipleAsPaid(ids: string[]): Promise<DbSettlement[]> {
        if (ids.length === 0) {
            return [];
        }
        const now = new Date().toISOString();
        await this.db
            .update(settlements)
            .set({
                status: 'PAID',
                paidAt: now,
                updatedAt: now,
            })
            .where(inArray(settlements.id, ids))
            .execute();

        return this.db
            .select()
            .from(settlements)
            .where(inArray(settlements.id, ids))
            .execute();
    }

    async markAsPartiallyPaid(settlementId: string, amount: number): Promise<DbSettlement> {
        if (amount <= 0) {
            throw new Error('Partial amount must be greater than 0');
        }

        return this.db.transaction(async (tx) => {
            const existing = await tx.select().from(settlements).where(eq(settlements.id, settlementId));
            const current = existing[0];

            if (!current) {
                throw new Error('Settlement not found');
            }

            const currentAmount = Number(current.amount);
            if (amount >= currentAmount) {
                throw new Error('Partial amount must be less than total amount');
            }

            const remainingAmount = currentAmount - amount;
            const now = new Date().toISOString();

            await tx
                .update(settlements)
                .set({
                    amount: remainingAmount,
                    updatedAt: now,
                })
                .where(eq(settlements.id, settlementId))
                .execute();

            await tx
                .insert(settlements)
                .values({
                    type: current.type,
                    direction: current.direction,
                    driverId: current.driverId,
                    businessId: current.businessId,
                    orderId: current.orderId,
                    amount: amount,
                    status: 'PAID',
                    paidAt: now,
                    ruleId: current.ruleId,
                })
                .execute();

            const updated = await tx.select().from(settlements).where(eq(settlements.id, settlementId));
            return updated[0]!;
        });
    }

    async unsettleSettlement(settlementId: string): Promise<DbSettlement> {
        const now = new Date().toISOString();
        const result = await this.db
            .update(settlements)
            .set({
                status: 'PENDING',
                paidAt: null,
                updatedAt: now,
            })
            .where(eq(settlements.id, settlementId))
            .returning();

        return result[0]!;
    }

    /**
     * Delete all PENDING settlements for a given order (used when an order is cancelled
     * before any settlement has been paid out).
     * Returns the number of rows deleted.
     */
    async deletePendingByOrderId(orderId: string): Promise<number> {
        const deleted = await this.db
            .delete(settlements)
            .where(
                and(
                    eq(settlements.orderId, orderId),
                    eq(settlements.status, 'PENDING'),
                ),
            )
            .returning({ id: settlements.id });
        return deleted.length;
    }
}
