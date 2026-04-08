import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { createAuditLogger } from '@/services/AuditLogger';
import { AppError } from '@/lib/errors';

export const markSettlementsAsPaid: NonNullable<MutationResolvers['markSettlementsAsPaid']> = async (
    _parent,
    { ids },
    context
): Promise<any> => {
    if (!context.userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(context.userData.role!)) {
        throw AppError.forbidden();
    }
    const { db } = context;
    const repo = new SettlementRepository(db);
    const result = await repo.markMultipleAsPaid(ids);
    
    // Log the action
    const logger = createAuditLogger(db, context);
    for (const settlement of result) {
        await logger.log({
            action: 'SETTLEMENT_PAID',
            entityType: 'SETTLEMENT',
            entityId: settlement.id,
            metadata: {
                settlementIds: ids,
                amount: settlement.amount,
                type: settlement.type,
            },
        });
    }
    
    return result;
};