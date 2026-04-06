import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const createPromotion: NonNullable<MutationResolvers['createPromotion']> = async (
    _parent,
    { input },
    { promotionService, userData },
) => {
    const result = await promotionService.createPromotion(input as any, userData);
    await cache.invalidatePromotions();
    return result;
};
