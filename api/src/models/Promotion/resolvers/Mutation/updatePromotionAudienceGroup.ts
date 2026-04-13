import type { MutationResolvers } from './../../../../generated/types.generated';

export const updatePromotionAudienceGroup: NonNullable<MutationResolvers['updatePromotionAudienceGroup']> = async (
    _parent,
    { input },
    { promotionService, userData },
) => {
    return promotionService.updatePromotionAudienceGroup(
        {
            id: input.id,
            name: input.name ?? undefined,
            description: input.description ?? undefined,
            userIds: input.userIds ?? undefined,
            isActive: input.isActive ?? undefined,
        },
        userData,
    ) as any;
};
