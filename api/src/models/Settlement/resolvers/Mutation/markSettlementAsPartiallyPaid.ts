import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { createAuditLogger } from '@/services/AuditLogger';

export const markSettlementAsPartiallyPaid: NonNullable<
        MutationResolvers['markSettlementAsPartiallyPaid']
> = async (_parent, { settlementId, amount }, context) => {
        const { db } = context;
        const repo = new SettlementRepository(db);
        const result = await repo.markAsPartiallyPaid(settlementId, amount);
        
        // Log the action
        const logger = createAuditLogger(db, context);
        await logger.log({
            action: 'SETTLEMENT_PARTIAL_PAID',
            entityType: 'SETTLEMENT',
            entityId: settlementId,
            metadata: { amount, settlementId },
        });
        
        return result;
};