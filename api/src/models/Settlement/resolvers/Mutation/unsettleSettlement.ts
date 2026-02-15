import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const unsettleSettlement: NonNullable<MutationResolvers['unsettleSettlement']> = async (
    _parent,
    { settlementId },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.unsettleSettlement(settlementId);
};
