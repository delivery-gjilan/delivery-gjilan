import type { MutationResolvers } from './../../../../generated/types.generated';

export const deletePromotion: NonNullable<MutationResolvers['deletePromotion']> = async (
        _parent,
        { id },
        { userData, promotionService },
) => {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
                throw new Error('Forbidden');
        }

        return promotionService.deletePromotion(id);
};