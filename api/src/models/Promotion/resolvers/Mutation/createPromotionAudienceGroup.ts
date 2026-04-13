import type { MutationResolvers } from './../../../../generated/types.generated';

export const createPromotionAudienceGroup: NonNullable<MutationResolvers['createPromotionAudienceGroup']> = async (
    _parent,
    { input },
    { promotionService, userData },
) => {
    return promotionService.createPromotionAudienceGroup(
        {
            name: input.name,
            description: input.description ?? undefined,
            userIds: input.userIds,
            isActive: input.isActive ?? undefined,
        },
        userData,
    ) as any;
};
