import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionService } from '@/services/PromotionService';
import { userPromotions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const assignPromotionToUsers: NonNullable<MutationResolvers['assignPromotionToUsers']> = async (
    _parent,
    { input },
    { userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new Error('Forbidden');
    }

    const db = await getDB();
    const service = new PromotionService(db);

    await service.assignPromotionToUsers(input.promotionId, input.userIds);

    // Return assigned user promotions
    const assignments = await db.query.userPromotions.findMany({
        where: (up) => eq(up.promotionId, input.promotionId),
    });

    return assignments.map(a => ({
        id: a.id,
        userId: a.userId,
        promotionId: a.promotionId,
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt,
        usageCount: a.usageCount,
    }));
};