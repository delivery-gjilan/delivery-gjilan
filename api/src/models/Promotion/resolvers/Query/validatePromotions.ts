import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { PromotionEngine } from '@/services/PromotionEngine';
import { AppError } from '@/lib/errors';

export const validatePromotions: NonNullable<QueryResolvers['validatePromotions']> = async (
        _parent,
        { cart, manualCode },
        { userData }
) => {
        if (!userData.userId) {
                throw AppError.unauthorized();
        }

        const db = await getDB();
        const promotionEngine = new PromotionEngine(db);

        return promotionEngine.applyPromotions(userData.userId, cart, manualCode ?? undefined);
};