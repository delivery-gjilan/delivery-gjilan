import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionEngineV2 } from '@/services/PromotionEngineV2';

export const validatePromotionsV2: NonNullable<QueryResolvers['validatePromotionsV2']> = async (
        _parent,
        { cart, manualCode },
        { userData }
) => {
        if (!userData.userId) {
                throw new Error('Unauthorized');
        }

        const db = await getDB();
        const promotionEngine = new PromotionEngineV2(db);

        return promotionEngine.applyPromotions(userData.userId, cart, manualCode ?? undefined);
};