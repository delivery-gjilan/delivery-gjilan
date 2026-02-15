import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const markSettlementsAsPaid: NonNullable<MutationResolvers['markSettlementsAsPaid']> = async (
    _parent,
    { ids },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.markMultipleAsPaid(ids);
};