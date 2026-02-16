import type { QueryResolvers } from './../../../../generated/types.generated';

export const validatePromotion: NonNullable<QueryResolvers['validatePromotion']> = async (
        _parent,
        { input },
        { userData, promotionService },
) => {
        if (!userData.userId) {
                throw new Error('Unauthorized');
        }

        return promotionService.validatePromotionForUser(
                userData.userId,
                input.code,
                input.itemsTotal,
                input.deliveryPrice,
        );
};