import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const deleteBusiness: NonNullable<MutationResolvers['deleteBusiness']> = async (
    _parent,
    { id },
    { businessService },
) => {
    const result = await businessService.deleteBusiness(id);
    await cache.invalidateBusiness(id);
    return result;
};
