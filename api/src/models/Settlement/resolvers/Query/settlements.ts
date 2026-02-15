import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const settlements: NonNullable<QueryResolvers['settlements']> = async (
    _parent,
    args,
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.getSettlements(args);
};