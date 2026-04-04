import { type DbType } from '@/database';
import { 
    settlementRules, DbSettlementRule, NewDbSettlementRule 
} from '@/database/schema';
import { eq, and, or, isNull, isNotNull, inArray, type SQL } from 'drizzle-orm';

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

    async getRules(filters: SettlementRuleFilters): Promise<DbSettlementRule[]> {
        let query = this.db.select().from(settlementRules);
        const conditions = [];

        // Always exclude soft-deleted
        conditions.push(eq(settlementRules.isDeleted, false));

        if (filters.entityTypes && filters.entityTypes.length > 0) {
            conditions.push(inArray(settlementRules.entityType, filters.entityTypes as any));
        }

        if (filters.type) {
            conditions.push(eq(settlementRules.type, filters.type as any));
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

        if (conditions.length > 0) {
            const combined = and(...conditions);
            if (combined) {
                query = query.where(combined) as any;
            }
        }

        const rules = await query.orderBy(settlementRules.createdAt);
        return rules.map((rule) => ({
            ...rule,
            amount: parseFloat(rule.amount as any),
        })) as any;
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
