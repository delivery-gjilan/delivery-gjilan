
import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { and, eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const getAllPromotions: NonNullable<QueryResolvers['getAllPromotions']> = async (_parent, args, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw AppError.forbidden();
  }

  const db = await getDB();

  const conditions = [
    eq(promotions.isDeleted, false),
    // Recovery promotions are hidden from the main list unless explicitly requested
    eq(promotions.isRecovery, args.includeRecovery === true),
  ];
  
  if (args.isActive !== undefined && args.isActive !== null) {
    conditions.push(eq(promotions.isActive, args.isActive));
  }

  const promoList = await db
    .select({
      id: promotions.id,
      name: promotions.name,
      description: promotions.description,
      code: promotions.code,
      type: promotions.type,
      target: promotions.target,
      discountValue: promotions.discountValue,
      maxDiscountCap: promotions.maxDiscountCap,
      minOrderAmount: promotions.minOrderAmount,
      spendThreshold: promotions.spendThreshold,
      thresholdReward: promotions.thresholdReward,
      maxGlobalUsage: promotions.maxGlobalUsage,
      currentGlobalUsage: promotions.currentGlobalUsage,
      maxUsagePerUser: promotions.maxUsagePerUser,
      isStackable: promotions.isStackable,
      priority: promotions.priority,
      isActive: promotions.isActive,
      isRecovery: promotions.isRecovery,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      createdAt: promotions.createdAt,
      totalUsageCount: promotions.totalUsageCount,
      totalRevenue: promotions.totalRevenue,
      creatorType: promotions.creatorType,
      creatorId: promotions.creatorId,
    })
    .from(promotions)
    .where(and(...conditions));
  
  // Helper to ensure ISO string format
  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
  };
  
  return promoList.map(promo => ({
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
    isRecovery: promo.isRecovery,
    startsAt: toISOString(promo.startsAt),
    endsAt: toISOString(promo.endsAt),
    // Backward-compatible defaults if recurring schedule columns are not present in DB yet.
    scheduleType: 'DATE_RANGE',
    scheduleTimezone: null,
    dailyStartTime: null,
    dailyEndTime: null,
    activeWeekdays: [],
    newUserWindowDays: null,
    createdAt: toISOString(promo.createdAt)!,
    totalUsageCount: promo.totalUsageCount,
    totalRevenue: promo.totalRevenue || 0,
    creatorType: promo.creatorType,
    creatorId: promo.creatorId,
  })) as any;
};
