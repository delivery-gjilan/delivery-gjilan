import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, userPromotions, promotionBusinessEligibility } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const deletePromotion: NonNullable<MutationResolvers['deletePromotion']> = async (_parent, { id }, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();
  
  // Delete related records first
  await db.delete(userPromotions).where(eq(userPromotions.promotionId, id));
  await db.delete(promotionBusinessEligibility).where(eq(promotionBusinessEligibility.promotionId, id));
  
  // Delete the promotion
  await db.delete(promotions).where(eq(promotions.id, id));
  
  return true;
};