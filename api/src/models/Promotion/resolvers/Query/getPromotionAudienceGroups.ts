import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const getPromotionAudienceGroups: NonNullable<QueryResolvers['getPromotionAudienceGroups']> = async (
    _parent,
    args,
    { promotionService, userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const groups = await promotionService.listPromotionAudienceGroups({
        isActive: args.isActive ?? undefined,
        search: args.search ?? undefined,
    });

    return groups as any;
};
