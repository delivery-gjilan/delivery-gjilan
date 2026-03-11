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
    entityId?: string;
    ruleType?: string;
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

        if (filters.entityId) {
            conditions.push(eq(settlementRules.entityId, filters.entityId));
        }

        if (filters.ruleType) {
            conditions.push(eq(settlementRules.ruleType, filters.ruleType as any));
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

        return query.orderBy(settlementRules.priority, settlementRules.createdAt);
    }

    async getActiveRulesForEntity(
        entityType: 'DRIVER' | 'BUSINESS',
        entityId: string
    ): Promise<DbSettlementRule[]> {
        return this.getRules({
            entityType,
            entityId,
            isActive: true
        });
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

    async activateRule(id: string, activatedBy: string): Promise<DbSettlementRule> {
        const now = new Date().toISOString();

        const updated = await this.db
            .update(settlementRules)
            .set({
                isActive: true,
                activatedAt: now,
                activatedBy,
                updatedAt: now
            })
            .where(eq(settlementRules.id, id))
            .returning();

        if (!updated || updated.length === 0 || !updated[0]) {
            throw new Error(`Settlement rule ${id} not found`);
        }

        return updated[0];
    }

    async deactivateRule(id: string): Promise<DbSettlementRule> {
        const now = new Date().toISOString();

        const updated = await this.db
            .update(settlementRules)
            .set({
                isActive: false,
                updatedAt: now
            })
            .where(eq(settlementRules.id, id))
            .returning();

        if (!updated || updated.length === 0 || !updated[0]) {
            throw new Error(`Settlement rule ${id} not found`);
        }

        return updated[0];
    }

    async deleteRule(id: string): Promise<boolean> {
        const result = await this.db
            .delete(settlementRules)
            .where(eq(settlementRules.id, id))
            .returning({ id: settlementRules.id });

        return result.length > 0;
    }

    /**
     * Get summary of active rules for an entity
     */
    async getRuleSummary(entityType: 'DRIVER' | 'BUSINESS', entityId: string): Promise<{
        totalRules: number;
        activeRules: number;
        rulesByType: Record<string, number>;
    }> {
        const allRules = await this.getRules({ entityType, entityId });
        const activeRules = allRules.filter(r => r.isActive);

        const rulesByType: Record<string, number> = {};
        for (const rule of activeRules) {
            rulesByType[rule.ruleType] = (rulesByType[rule.ruleType] || 0) + 1;
        }

        return {
            totalRules: allRules.length,
            activeRules: activeRules.length,
            rulesByType
        };
    }
}
