import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const businessBalance: NonNullable<QueryResolvers['businessBalance']> = async (
    _parent,
    { businessId },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.getBusinessBalance(businessId);
};