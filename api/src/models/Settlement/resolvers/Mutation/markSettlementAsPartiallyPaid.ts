import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { createAuditLogger } from '@/services/AuditLogger';
import { AppError } from '@/lib/errors';

export const markSettlementAsPartiallyPaid: NonNullable<
        MutationResolvers['markSettlementAsPartiallyPaid']
> = async (_parent, { settlementId, amount }, context): Promise<any> => {
        if (!context.userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(context.userData.role!)) {
            throw AppError.forbidden();
        }
        if (!amount || amount <= 0) {
            throw AppError.badInput('Amount must be greater than 0');
        }
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