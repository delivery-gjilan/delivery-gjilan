import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementPaymentRepository } from '@/repositories/SettlementPaymentRepository';

export const settlementPayment: NonNullable<QueryResolvers['settlementPayment']> = async (
    _parent,
    { id },
    { db }
) => {
    const repo = new SettlementPaymentRepository(db);
    return repo.getById(id);
};
