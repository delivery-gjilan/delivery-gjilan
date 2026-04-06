import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

export const deletePromotion: NonNullable<MutationResolvers['deletePromotion']> = async (_parent, { id }, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();
  
  // Soft-delete: mark as deleted and deactivate (preserves FK references from orders, settlements, etc.)
  await db.update(promotions).set({ isDeleted: true, isActive: false }).where(eq(promotions.id, id));
  await cache.invalidatePromotions();
  
  return true;
};