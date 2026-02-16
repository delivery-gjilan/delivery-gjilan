import type { QueryResolvers } from './../../../../generated/types.generated';

export const promotion: NonNullable<QueryResolvers['promotion']> = async (_parent, { code }, { userData, promotionService }) => {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
                throw new Error('Forbidden');
        }

        return promotionService.getPromotionByCode(code);
};