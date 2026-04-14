import { type DbType } from '@/database';
import { 
    settlementRules, DbSettlementRule, NewDbSettlementRule 
} from '@/database/schema';
import { eq, and, or, isNull, isNotNull, inArray, sql, type SQL } from 'drizzle-orm';

/** NOTE: The settlement_rules table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

type Database = DbType;

export interface SettlementRuleFilters {
    entityTypes?: ('DRIVER' | 'BUSINESS')[];
    type?: 'ORDER_PRICE' | 'DELIVERY_PRICE';
    businessIds?: string[];
    promotionIds?: string[];
    scopes?: ('GLOBAL' | 'BUSINESS' | 'PROMOTION' | 'BUSINESS_PROMOTION')[];
    isActive?: boolean;
}

export class SettlementRuleRepository {
    constructor(private db: Database) {}

    async getRuleById(id: string): Promise<DbSettlementRule | null> {
        const result = await this.db
            .select()
            .from(settlementRules)
            .where(and(eq(settlementRules.id, id), eq(settlementRules.isDeleted, false)));
        
        return result[0] || null;
    }

    async getRules(filters: SettlementRuleFilters, limit?: number, offset?: number): Promise<DbSettlementRule[]> {
        let query = this.db.select().from(settlementRules).$dynamic();
        const conditions = this.buildFilterConditions(filters);

        if (conditions.length > 0) {
            const combined = and(...conditions);
            if (combined) {
                query = query.where(combined);
            }
        }

        query = query.orderBy(settlementRules.createdAt);

        if (limit !== undefined && limit > 0) {
            query = query.limit(limit);
        }

        if (offset !== undefined && offset > 0) {
            query = query.offset(offset);
        }

        const rules = await query;
        return rules;
    }

    async getRulesCount(filters: SettlementRuleFilters): Promise<number> {
        const conditions = this.buildFilterConditions(filters);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const result = await this.db
            .select({ count: sql<number>`COUNT(*)::INT` })
            .from(settlementRules)
            .where(whereClause)
            .then((rows) => rows[0]);

        return result?.count ?? 0;
    }

    private buildFilterConditions(filters: SettlementRuleFilters): SQL[] {
        const conditions: SQL[] = [];

        // Always exclude soft-deleted
        conditions.push(eq(settlementRules.isDeleted, false));

        if (filters.entityTypes && filters.entityTypes.length > 0) {
            conditions.push(inArray(settlementRules.entityType, filters.entityTypes));
        }

        if (filters.type) {
            conditions.push(eq(settlementRules.type, filters.type));
        }

        if (filters.businessIds && filters.businessIds.length > 0) {
            conditions.push(inArray(settlementRules.businessId, filters.businessIds));
        }

        if (filters.promotionIds && filters.promotionIds.length > 0) {
            conditions.push(inArray(settlementRules.promotionId, filters.promotionIds));
        }

        if (filters.scopes && filters.scopes.length > 0) {
            const scopeConditions = filters.scopes.map(scope => {
                switch (scope) {
                    case 'GLOBAL':
                        return and(isNull(settlementRules.businessId), isNull(settlementRules.promotionId));
                    case 'BUSINESS':
                        return and(isNotNull(settlementRules.businessId), isNull(settlementRules.promotionId));
                    case 'PROMOTION':
                        return and(isNull(settlementRules.businessId), isNotNull(settlementRules.promotionId));
                    case 'BUSINESS_PROMOTION':
                        return and(isNotNull(settlementRules.businessId), isNotNull(settlementRules.promotionId));
                }
            });
            const combinedScopes = or(...scopeConditions);
            if (combinedScopes) {
                conditions.push(combinedScopes);
            }
        }

        if (filters.isActive !== undefined) {
            conditions.push(eq(settlementRules.isActive, filters.isActive));
        }

        return conditions;
    }

    async createRule(rule: NewDbSettlementRule): Promise<DbSettlementRule> {
        const created = await this.db
            .insert(settlementRules)
            .values(rule)
            .returning();

        if (!created || created.length === 0 || !created[0]) {
            throw new Error('Failed to create settlement rule');
        }

        return created[0];
    }

    async updateRule(
        id: string,
        updates: Partial<NewDbSettlementRule>
    ): Promise<DbSettlementRule> {
        const now = new Date().toISOString();
        
        const updated = await this.db
            .update(settlementRules)
            .set({
                ...updates,
                updatedAt: now
            })
            .where(eq(settlementRules.id, id))
            .returning();

        if (!updated || updated.length === 0 || !updated[0]) {
            throw new Error(`Settlement rule ${id} not found`);
        }

        return updated[0];
    }

    async toggleActive(id: string, isActive: boolean): Promise<DbSettlementRule> {
        return this.updateRule(id, { isActive });
    }

    async deleteRule(id: string): Promise<boolean> {
        // Soft-delete: mark as deleted instead of removing
        const [result] = await this.db
            .update(settlementRules)
            .set({ isDeleted: true, isActive: false })
            .where(eq(settlementRules.id, id))
            .returning();

        return !!result;
    }
}
