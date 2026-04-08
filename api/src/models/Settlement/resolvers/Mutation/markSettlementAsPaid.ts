import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { AppError } from '@/lib/errors';

export const markSettlementAsPaid: NonNullable<MutationResolvers['markSettlementAsPaid']> = async (
    _parent,
    { settlementId },
    { db, userData }
): Promise<any> => {
    if (!userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role!)) {
        throw AppError.forbidden();
    }
    const repo = new SettlementRepository(db);
    return repo.markAsPaid(settlementId);
};