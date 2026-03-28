import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const unsettledBalance: NonNullable<QueryResolvers['unsettledBalance']> = async (
    _parent,
    { entityType, entityId },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.getUnsettledBalance(entityType as 'DRIVER' | 'BUSINESS', entityId);
};
