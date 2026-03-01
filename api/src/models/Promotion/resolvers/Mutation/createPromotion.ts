import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, userPromotions, promotionBusinessEligibility } from '@/database/schema';
import { AppError } from '@/lib/errors';

export const createPromotion: NonNullable<MutationResolvers['createPromotion']> = async (_parent, { input }, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();
  
  const [promo] = await db.insert(promotions).values({
    name: input.name,
    description: input.description || null,
    code: input.code?.toUpperCase() || null,
    type: input.type,
    target: input.target,
    discountValue: input.discountValue || null,
    maxDiscountCap: input.maxDiscountCap || null,
    minOrderAmount: input.minOrderAmount || null,
    spendThreshold: input.spendThreshold || null,
    thresholdReward: input.thresholdReward || null,
    maxGlobalUsage: input.maxGlobalUsage || null,
    maxUsagePerUser: input.maxUsagePerUser || null,
    isStackable: input.isStackable,
    priority: input.priority,
    isActive: input.isActive,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  }).returning();

  // Assign to specific users if provided
  if (input.targetUserIds && input.targetUserIds.length > 0) {
    await db.insert(userPromotions).values(
      input.targetUserIds.map(userId => ({
        userId,
        promotionId: promo.id,
      }))
    );
  }

  // Add business eligibility if provided
  if (input.eligibleBusinessIds && input.eligibleBusinessIds.length > 0) {
    await db.insert(promotionBusinessEligibility).values(
      input.eligibleBusinessIds.map(businessId => ({
        promotionId: promo.id,
        businessId,
      }))
    );
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