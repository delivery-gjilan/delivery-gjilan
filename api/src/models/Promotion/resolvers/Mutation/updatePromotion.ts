// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, promotionBusinessEligibility } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const updatePromotion: NonNullable<MutationResolvers['updatePromotion']> = async (_parent, { input }, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();
  
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.code !== undefined) updateData.code = input.code?.toUpperCase() || null;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.target !== undefined) updateData.target = input.target;
  if (input.discountValue !== undefined) updateData.discountValue = input.discountValue;
  if (input.maxDiscountCap !== undefined) updateData.maxDiscountCap = input.maxDiscountCap;
  if (input.minOrderAmount !== undefined) updateData.minOrderAmount = input.minOrderAmount;
  if (input.spendThreshold !== undefined) updateData.spendThreshold = input.spendThreshold;
  if (input.thresholdReward !== undefined) updateData.thresholdReward = input.thresholdReward;
  if (input.maxGlobalUsage !== undefined) updateData.maxGlobalUsage = input.maxGlobalUsage;
  if (input.maxUsagePerUser !== undefined) updateData.maxUsagePerUser = input.maxUsagePerUser;
  if (input.isStackable !== undefined) updateData.isStackable = input.isStackable;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.startsAt !== undefined) updateData.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (input.endsAt !== undefined) updateData.endsAt = input.endsAt ? new Date(input.endsAt) : null;

  const [promo] = await db
    .update(promotions)
    .set(updateData)
    .where(eq(promotions.id, input.id))
    .returning();

  if (!promo) {
    throw AppError.notFound('Promotion');
  }

  // Update eligible businesses if provided
  if (input.eligibleBusinessIds !== undefined) {
    // Delete existing business eligibility records
    await db
      .delete(promotionBusinessEligibility)
      .where(eq(promotionBusinessEligibility.promotionId, input.id));

    // Insert new business eligibility records
    if (input.eligibleBusinessIds.length > 0) {
      await db.insert(promotionBusinessEligibility).values(
        input.eligibleBusinessIds.map((businessId) => ({
          promotionId: input.id,
          businessId,
        }))
      );
    }
  }

  // Helper to ensure ISO string format
  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
  };

  return {
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
  };
};