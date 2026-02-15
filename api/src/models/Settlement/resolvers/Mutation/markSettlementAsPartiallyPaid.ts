import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const markSettlementAsPartiallyPaid: NonNullable<
        MutationResolvers['markSettlementAsPartiallyPaid']
> = async (_parent, { settlementId, amount }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.markAsPartiallyPaid(settlementId, amount);
};