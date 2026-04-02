import type { MutationResolvers } from './../../../../generated/types.generated';

export const createPromotion: NonNullable<MutationResolvers['createPromotion']> = async (
    _parent,
    { input },
    { promotionService, userData },
) => {
    return promotionService.createPromotion(input as any, userData);
};
