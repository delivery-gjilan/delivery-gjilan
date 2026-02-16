import type { QueryResolvers } from './../../../../generated/types.generated';

export const promotions: NonNullable<QueryResolvers['promotions']> = async (_parent, _arg, { userData, promotionService }) => {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
                throw new Error('Forbidden');
        }

        return promotionService.listPromotions();
};