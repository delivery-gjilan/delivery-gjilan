import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const getPromotionUsage: NonNullable<QueryResolvers['getPromotionUsage']> = async (
    _parent,
    { promotionId, limit, offset },
    { promotionService, userData },
) => {
    if (!userData.userId || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }
    const usage = await promotionService.getPromotionUsage(promotionId, limit ?? undefined, offset ?? undefined);
    return usage.map((u) => ({ ...u, usedAt: u.createdAt }));
};
