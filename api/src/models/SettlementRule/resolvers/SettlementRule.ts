import type { SettlementRuleResolvers } from './../../../generated/types.generated';
import { businesses, promotions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const SettlementRule: SettlementRuleResolvers = {
    business: async (rule, _, { db }) => {
        if (!rule.businessId) return null;
        const result = await db
            .select()
            .from(businesses)
            .where(eq(businesses.id, rule.businessId as string))
            .limit(1);
        return result[0] || null;
    },
    promotion: async (rule, _, { db }) => {
        if (!rule.promotionId) return null;
        const result = await db
            .select()
            .from(promotions)
            .where(eq(promotions.id, rule.promotionId as string))
            .limit(1);
        return result[0] || null;
    },
    amount: (rule) => {
        return Number(rule.amount);
    },
    maxAmount: (rule) => {
        const val = (rule as any).maxAmount;
        return val != null ? Number(val) : null;
    },
    // Backward-compat: derive appliesTo from type
    appliesTo: (rule) => {
        const ruleType = (rule as any).type;
        if (ruleType === 'ORDER_PRICE') return 'SUBTOTAL';
        if (ruleType === 'DELIVERY_PRICE') return 'DELIVERY_FEE';
        return null;
    },
} as any;