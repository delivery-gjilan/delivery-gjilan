import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';

export const updatePromotion: NonNullable<MutationResolvers['updatePromotion']> = async (_parent, { input }, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();
  
  // Editing promotions is intentionally limited for now (name + code only)
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code?.trim() ? input.code.toUpperCase() : null;

  const [promo] = await db
    .update(promotions)
    .set(updateData)
    .where(eq(promotions.id, input.id))
    .returning();

  if (!promo) {
    throw AppError.notFound('Promotion');
  }


  // Helper to ensure ISO string format
  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
  };

  const result = {
    id: promo.id,
    name: promo.name,
    description: promo.description,
    code: promo.code,
    type: promo.type,
    target: promo.target,
    discountValue: promo.discountValue,
    maxDiscountCap: promo.maxDiscountCap,
    minOrderAmount: promo.minOrderAmount,
    spendThreshold: promo.spendThreshold,
    thresholdReward: promo.thresholdReward ? JSON.stringify(promo.thresholdReward) : null,
    maxGlobalUsage: promo.maxGlobalUsage,
    currentGlobalUsage: promo.currentGlobalUsage,
    maxUsagePerUser: promo.maxUsagePerUser,
    isStackable: promo.isStackable,
    priority: promo.priority,
    isActive: promo.isActive,
    startsAt: toISOString(promo.startsAt),
    endsAt: toISOString(promo.endsAt),
    createdAt: toISOString(promo.createdAt)!,
    totalUsageCount: promo.totalUsageCount,
    totalRevenue: promo.totalRevenue || 0,
    creatorType: promo.creatorType,
    creatorId: promo.creatorId,
  };

  await cache.invalidatePromotions();
  return result;
};