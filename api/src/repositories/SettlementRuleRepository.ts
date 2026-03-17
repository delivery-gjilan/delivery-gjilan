import { type DbType } from '@/database';
import { 
    settlementRules, 
    DbSettlementRule, 
    NewDbSettlementRule 
} from '@/database/schema';
import { eq, and, sql } from 'drizzle-orm';

type Database = DbType;

export interface SettlementRuleFilters {
    entityType?: 'DRIVER' | 'BUSINESS';
    businessId?: string;
    promotionId?: string;
    isActive?: boolean;
}

export class SettlementRuleRepository {
    constructor(private db: Database) {}

    async getRuleById(id: string): Promise<DbSettlementRule | null> {
        const result = await this.db
            .select()
            .from(settlementRules)
            .where(eq(settlementRules.id, id));
        
        return result[0] || null;
    }

    async getRules(filters: SettlementRuleFilters): Promise<DbSettlementRule[]> {
        let query = this.db.select().from(settlementRules);
        const conditions = [];

        if (filters.entityType) {
            conditions.push(eq(settlementRules.entityType, filters.entityType as any));
        }

        if (filters.businessId) {
            conditions.push(eq(settlementRules.businessId, filters.businessId));
        }

        if (filters.promotionId) {
            conditions.push(eq(settlementRules.promotionId, filters.promotionId));
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

        return query.orderBy(settlementRules.createdAt);
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
        const result = await this.db
            .delete(settlementRules)
            .where(eq(settlementRules.id, id))
            .returning({ id: settlementRules.id });

        return result.length > 0;
    }
}
