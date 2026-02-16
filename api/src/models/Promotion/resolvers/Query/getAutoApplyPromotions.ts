import type { QueryResolvers } from './../../../../generated/types.generated';

export const getAutoApplyPromotions: NonNullable<QueryResolvers['getAutoApplyPromotions']> = async (
        _parent,
        { input },
        { userData, promotionService },
) => {
        if (!userData.userId) {
                return [];
        }

        return promotionService.getAutoApplyPromotions(
                userData.userId,
                input.itemsTotal,
                input.deliveryPrice,
        );
};