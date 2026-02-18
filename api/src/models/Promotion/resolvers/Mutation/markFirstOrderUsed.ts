import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionService } from '@/services/PromotionService';

export const markFirstOrderUsed: NonNullable<MutationResolvers['markFirstOrderUsed']> =  async (
    _parent,
    { userId },
    { userData }
) => {
    if (!userData.userId || userData.userId !== userId) {
        throw new Error('Unauthorized');
    }

    const db = await getDB();
    const service = new PromotionService(db);

    await service.markFirstOrderUsed(userId);

    const metadata = await service.getUserPromoMetadata(userId);
    return {
        userId: metadata.userId,
        hasUsedFirstOrderPromo: metadata.hasUsedFirstOrderPromo,
        totalSavings: metadata.totalSavings,
        totalPromosUsed: metadata.totalPromotionsUsed,
        lastPromoUsedAt: metadata.firstOrderPromoUsedAt,
    };
};