import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { createAuditLogger } from '@/services/AuditLogger';
import { AppError } from '@/lib/errors';

export const unsettleSettlement: NonNullable<MutationResolvers['unsettleSettlement']> = async (
    _parent,
    { settlementId },
    context
): Promise<any> => {
    if (!context.userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(context.userData.role!)) {
        throw AppError.forbidden();
    }
    const { db } = context;
    const repo = new SettlementRepository(db);
    const result = await repo.unsettleSettlement(settlementId);
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'SETTLEMENT_UNSETTLED',
        entityType: 'SETTLEMENT',
        entityId: settlementId,
        metadata: { settlementId },
    });
    
    return result;
};
