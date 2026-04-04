import type { QueryResolvers } from './../../../../generated/types.generated';
import { getPrioritySurchargeAmount } from '@/config/prioritySurcharge';

export const prioritySurchargeAmount: NonNullable<QueryResolvers['prioritySurchargeAmount']> = async (
    _parent,
    _args,
    _context,
) => {
    return getPrioritySurchargeAmount();
};