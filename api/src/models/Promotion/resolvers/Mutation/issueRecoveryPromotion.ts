import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionService } from '@/services/PromotionService';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

export const issueRecoveryPromotion: NonNullable<MutationResolvers['issueRecoveryPromotion']> = async (
    _parent,
    { input },
    { userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const db = await getDB();
    const service = new PromotionService(db);

    const assignments = await service.issueRecoveryPromotion(
        {
            type: input.type as any,
            discountValue: input.discountValue ?? undefined,
            userIds: input.userIds as string[],
            reason: input.reason,
            expiresAt: input.expiresAt ?? undefined,
        },
        userData,
    );

    await cache.invalidatePromotions();

    return assignments.map(a => ({
        id: a.id,
        userId: a.userId,
        promotionId: a.promotionId,
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt ?? null,
        usageCount: a.usageCount,
    }));
};
