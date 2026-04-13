import type { MutationResolvers } from './../../../../generated/types.generated';

export const deletePromotionAudienceGroup: NonNullable<MutationResolvers['deletePromotionAudienceGroup']> = async (
    _parent,
    { id },
    { promotionService, userData },
) => {
    return promotionService.deletePromotionAudienceGroup(id, userData);
};
