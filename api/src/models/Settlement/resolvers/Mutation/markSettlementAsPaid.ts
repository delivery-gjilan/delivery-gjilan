import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const markSettlementAsPaid: NonNullable<MutationResolvers['markSettlementAsPaid']> = async (
    _parent,
    { settlementId },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.markAsPaid(settlementId);
};