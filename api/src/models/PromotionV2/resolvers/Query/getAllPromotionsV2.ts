import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotionsV2 } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const getAllPromotionsV2: NonNullable<QueryResolvers['getAllPromotionsV2']> = async (_parent, args, { userData }) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden');
  }

  const db = await getDB();
  
  let query = db.select().from(promotionsV2);
  
  // Filter by isActive if provided
  if (args.isActive !== undefined && args.isActive !== null) {
    query = query.where(eq(promotionsV2.isActive, args.isActive)) as any;
  }
  
  const promotions = await query;
  
  // Helper to ensure ISO string format
  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
  };
  
  return promotions.map(promo => ({
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
  }));
};