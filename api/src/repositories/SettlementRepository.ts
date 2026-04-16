import { type DbType } from '@/database';
import { settlements, settlementRules } from '@/database/schema';
import { eq, and, or, gte, lte, sql, inArray, isNotNull, isNull, like, not } from 'drizzle-orm';
import { DbSettlement } from '@/database/schema/settlements';

export interface SettlementFilters {
    type?: string;
    direction?: string;
    status?: string;
    isSettled?: boolean;
    driverId?: string;
    businessId?: string;
    orderId?: string;
    promotionId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface SettlementSummaryFilters {
    type?: string;
    direction?: string;
    status?: string;
    isSettled?: boolean;
    driverId?: string;
    businessId?: string;
    orderId?: string;
    promotionId?: string;
    startDate?: string;
    endDate?: string;
}

export interface SettlementSummary {
    totalAmount: number;
    totalPending: number;
    totalPaid: number;
    totalReceivable: number;
    totalPayable: number;
    count: number;
    pendingCount: number;
}

export class SettlementRepository {
    constructor(private db: DbType) {}

    async getSettlementById(id: string): Promise<DbSettlement | null> {
        const result = await this.db.select().from(settlements).where(eq(settlements.id, id));
        return result[0] || null;
    }

    async getSettlements(filters: SettlementFilters): Promise<DbSettlement[]> {
        let query = this.db.select().from(settlements).$dynamic();
        const conditions = [];

        if (filters.type) {
            conditions.push(eq(settlements.type, filters.type as 'DRIVER' | 'BUSINESS'));
        }

        if (filters.direction) {
            conditions.push(eq(settlements.direction, filters.direction as 'RECEIVABLE' | 'PAYABLE'));
        }

        if (filters.status) {
            // Map status enum to isSettled boolean for DB query
            // status: PENDING → isSettled = false
            // status: PAID → isSettled = true
            // status: OVERDUE, DISPUTED, CANCELLED → isSettled = true (legacy, kept for backward compatibility)
            const isSettledValue = filters.status !== 'PENDING';
            conditions.push(eq(settlements.isSettled, isSettledValue));
        } else if (filters.isSettled !== undefined) {
            conditions.push(eq(settlements.isSettled, filters.isSettled));
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

        if (filters.promotionId) {
            // Filter by settlements whose rule has this promotionId
            const ruleIds = await this.db
                .select({ id: settlementRules.id })
                .from(settlementRules)
                .where(eq(settlementRules.promotionId, filters.promotionId));
            const ids = ruleIds.map(r => r.id);
            if (ids.length === 0) return [];
            conditions.push(inArray(settlements.ruleId, ids));
        }

        if (filters.category) {
            const categoryCondition = this.buildCategoryCondition(filters.category);
            if (categoryCondition) conditions.push(categoryCondition);
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

    async getSettlementSummary(filters: SettlementSummaryFilters): Promise<SettlementSummary> {
        const conditions = [];

        if (filters.type) {
            conditions.push(eq(settlements.type, filters.type as 'DRIVER' | 'BUSINESS'));
        }

        if (filters.direction) {
            conditions.push(eq(settlements.direction, filters.direction as 'RECEIVABLE' | 'PAYABLE'));
        }

        if (filters.status) {
            // Map status enum to isSettled boolean for DB query
            // status: PENDING → isSettled = false
            // status: PAID → isSettled = true
            // status: OVERDUE, DISPUTED, CANCELLED → isSettled = true (legacy, kept for backward compatibility)
            const isSettledValue = filters.status !== 'PENDING';
            conditions.push(eq(settlements.isSettled, isSettledValue));
        } else if (filters.isSettled !== undefined) {
            conditions.push(eq(settlements.isSettled, filters.isSettled));
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

        if (filters.promotionId) {
            const ruleIds = await this.db
                .select({ id: settlementRules.id })
                .from(settlementRules)
                .where(eq(settlementRules.promotionId, filters.promotionId));
            const ids = ruleIds.map(r => r.id);
            if (ids.length === 0) {
                return {
                    totalAmount: 0, totalPending: 0, totalPaid: 0,
                    totalReceivable: 0, totalPayable: 0, count: 0, pendingCount: 0,
                };
            }
            conditions.push(inArray(settlements.ruleId, ids));
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
                totalPending: sql<number>`SUM(CASE WHEN ${settlements.isSettled} = false THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalPaid: sql<number>`SUM(CASE WHEN ${settlements.isSettled} = true THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalReceivable: sql<number>`SUM(CASE WHEN ${settlements.direction} = 'RECEIVABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                totalPayable: sql<number>`SUM(CASE WHEN ${settlements.direction} = 'PAYABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END)::FLOAT`,
                count: sql<number>`COUNT(*)::INT`,
                pendingCount: sql<number>`COUNT(CASE WHEN ${settlements.isSettled} = false THEN 1 END)::INT`,
            })
            .from(settlements)
            .where(whereClause)
            .then((rows) => rows[0]);

        return {
            totalAmount: result.totalAmount || 0,
            totalPending: result.totalPending || 0,
            totalPaid: result.totalPaid || 0,
            totalReceivable: result.totalReceivable || 0,
            totalPayable: result.totalPayable || 0,
            count: result.count || 0,
            pendingCount: result.pendingCount || 0,
        };
    }

    async getDriverBalance(driverId: string): Promise<SettlementSummary> {
        return this.getSettlementSummary({
            type: 'DRIVER',
            driverId,
        });
    }

    async getBusinessBalance(businessId: string): Promise<SettlementSummary> {
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
        ruleId?: string | null,
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
                isSettled: true,
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
                isSettled: true,
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
                    isSettled: true,
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
                isSettled: false,
                settlementPaymentId: null,
                updatedAt: now,
            })
            .where(eq(settlements.id, settlementId))
            .returning();

        return result[0]!;
    }

    /**
     * Delete all unsettled settlements for a given order.
     */
    async deletePendingByOrderId(orderId: string): Promise<number> {
        const deleted = await this.db
            .delete(settlements)
            .where(
                and(
                    eq(settlements.orderId, orderId),
                    eq(settlements.isSettled, false),
                ),
            )
            .returning();
        return deleted.length;
    }

    async deletePendingByOrderIdForDriver(orderId: string): Promise<number> {
        const deleted = await this.db
            .delete(settlements)
            .where(
                and(
                    eq(settlements.orderId, orderId),
                    eq(settlements.isSettled, false),
                    isNotNull(settlements.driverId),
                ),
            )
            .returning();
        return deleted.length;
    }

    async deletePendingByOrderIdForBusiness(orderId: string): Promise<number> {
        const deleted = await this.db
            .delete(settlements)
            .where(
                and(
                    eq(settlements.orderId, orderId),
                    eq(settlements.isSettled, false),
                    isNotNull(settlements.businessId),
                ),
            )
            .returning();
        return deleted.length;
    }

    /**
     * Get all unsettled settlements for a given entity (driver or business).
     */
    async getUnsettledByEntity(
        entityType: 'DRIVER' | 'BUSINESS',
        entityId: string,
    ): Promise<DbSettlement[]> {
        const entityFilter =
            entityType === 'DRIVER'
                ? eq(settlements.driverId, entityId)
                : eq(settlements.businessId, entityId);

        return this.db
            .select()
            .from(settlements)
            .where(
                and(
                    eq(settlements.type, entityType),
                    eq(settlements.isSettled, false),
                    entityFilter,
                ),
            )
            .orderBy(sql`${settlements.createdAt} ASC`);
    }

    /**
     * Calculate the unsettled net balance for an entity.
     * Positive = entity owes platform, negative = platform owes entity.
     */
    async getUnsettledBalance(
        entityType: 'DRIVER' | 'BUSINESS',
        entityId: string,
    ): Promise<number> {
        const entityFilter =
            entityType === 'DRIVER'
                ? eq(settlements.driverId, entityId)
                : eq(settlements.businessId, entityId);

        const result = await this.db
            .select({
                net: sql<number>`
                    COALESCE(SUM(
                        CASE WHEN ${settlements.direction} = 'RECEIVABLE'
                            THEN CAST(${settlements.amount} AS NUMERIC)
                            ELSE -CAST(${settlements.amount} AS NUMERIC)
                        END
                    ), 0)::FLOAT
                `,
            })
            .from(settlements)
            .where(
                and(
                    eq(settlements.type, entityType),
                    eq(settlements.isSettled, false),
                    entityFilter,
                ),
            )
            .then((rows: any[]) => rows[0]);

        return result?.net ?? 0;
    }

    /**
     * Translates a computed category name back into SQL conditions on settlement rows.
     * Categories are a logical grouping derived from ruleId, reason, and rule properties.
     */
    private buildCategoryCondition(category: string) {
        const nullRuleId = isNull(settlements.ruleId);
        const hasRuleId = isNotNull(settlements.ruleId);

        switch (category) {
            case 'STOCK_REMITTANCE':
                return and(nullRuleId, like(settlements.reason, 'Stock item%'));
            case 'DRIVER_TIP':
                return and(nullRuleId, like(settlements.reason, 'Driver tip%'));
            case 'CATALOG_REVENUE':
                return and(nullRuleId, like(settlements.reason, 'Catalog product%'));
            case 'DIRECT_CALL_FIXED_FEE':
                return like(settlements.reason, 'Direct call fixed payment%');
            case 'AUTO_REMITTANCE':
                // Null ruleId and NOT any of the special reason patterns (handle null reason)
                return and(
                    nullRuleId,
                    or(isNull(settlements.reason), not(like(settlements.reason, 'Stock item%'))),
                    or(isNull(settlements.reason), not(like(settlements.reason, 'Driver tip%'))),
                    or(isNull(settlements.reason), not(like(settlements.reason, 'Catalog product%'))),
                    or(isNull(settlements.reason), not(like(settlements.reason, 'Direct call fixed payment%'))),
                );
            case 'PROMOTION_COST':
                // Has a rule that has a promotionId
                return sql`${settlements.ruleId} IN (SELECT ${settlementRules.id} FROM ${settlementRules} WHERE ${settlementRules.promotionId} IS NOT NULL)`;
            case 'DELIVERY_COMMISSION':
                return sql`${settlements.ruleId} IN (SELECT ${settlementRules.id} FROM ${settlementRules} WHERE ${settlementRules.type} = 'DELIVERY_PRICE' AND ${settlementRules.promotionId} IS NULL)`;
            case 'PLATFORM_COMMISSION':
                return sql`${settlements.ruleId} IN (SELECT ${settlementRules.id} FROM ${settlementRules} WHERE ${settlementRules.type} = 'ORDER_PRICE' AND ${settlementRules.promotionId} IS NULL)`;
            default:
                return undefined;
        }
    }
}
