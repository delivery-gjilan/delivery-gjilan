import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userPromotions } from '@/database/schema';
import { and, eq } from 'drizzle-orm';

export const removeUserFromPromotion: NonNullable<MutationResolvers['removeUserFromPromotion']> = async (
    _parent,
    { promotionId, userId },
    { userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new Error('Forbidden');
    }

    const db = await getDB();

    const result = await db
        .delete(userPromotions)
        .where(
            and(
                eq(userPromotions.promotionId, promotionId),
                eq(userPromotions.userId, userId)
            )
        );

    return !!result;
};