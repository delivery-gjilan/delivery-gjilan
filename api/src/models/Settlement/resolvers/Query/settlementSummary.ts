import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const settlementSummary: NonNullable<QueryResolvers['settlementSummary']> = async (
    _parent,
    args,
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.getSettlementSummary(args);
};