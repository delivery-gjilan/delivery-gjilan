import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionEngineV2 } from '@/services/PromotionEngineV2';

export const getApplicablePromotionsV2: NonNullable<QueryResolvers['getApplicablePromotionsV2']> = async (
        _parent,
        { cart, manualCode },
        { userData }
) => {
        if (!userData.userId) {
                throw new Error('Unauthorized');
        }

        const db = await getDB();
        const promotionEngine = new PromotionEngineV2(db);

        return promotionEngine.getApplicablePromotions(userData.userId, cart, manualCode ?? undefined);
};