import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementPaymentRepository } from '@/repositories/SettlementPaymentRepository';

export const settlementPayments: NonNullable<QueryResolvers['settlementPayments']> = async (
    _parent,
    args,
    { db }
) => {
    const repo = new SettlementPaymentRepository(db);
    return repo.getPayments(args);
};
