import type { SettleResultResolvers } from './../../../generated/types.generated';
import { eq } from 'drizzle-orm';
import { settlements, settlementPayments } from '@/database/schema';

export const SettleResult: SettleResultResolvers = {
    payment: async (result, _, { db }) => {
        const paymentId = (result as any).paymentId;
        const [payment] = await db
            .select()
            .from(settlementPayments)
            .where(eq(settlementPayments.id, paymentId))
            .limit(1);
        return payment as any;
    },

    remainderSettlement: async (result, _, { db }) => {
        const remainderSettlementId = (result as any).remainderSettlementId;
        if (!remainderSettlementId) return null;
        const [settlement] = await db
            .select()
            .from(settlements)
            .where(eq(settlements.id, remainderSettlementId))
            .limit(1);
        return settlement ?? null;
    },
} as any;
