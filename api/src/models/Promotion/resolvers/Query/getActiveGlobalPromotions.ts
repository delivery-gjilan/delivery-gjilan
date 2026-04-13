import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { and, eq, or, isNull, gt, lte } from 'drizzle-orm';
import { cache } from '@/lib/cache';

/**
 * Returns currently active promotions visible to all users (ALL_USERS or FIRST_ORDER target).
 * No cart context needed — used for global promo banners on the home / tab layout.
 */
export const getActiveGlobalPromotions: NonNullable<QueryResolvers['getActiveGlobalPromotions']> = async () => {
  const cached = await cache.get<ReturnType<typeof mapPromo>[]>(cache.keys.promotions());
  if (cached) return cached as any;

  const db = await getDB();
  const now = new Date().toISOString();

  const promoList = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        eq(promotions.isDeleted, false),
        // Global marketing surfaces should only include auto-applicable promos.
        isNull(promotions.code),
        or(eq(promotions.target, 'ALL_USERS'), eq(promotions.target, 'FIRST_ORDER')),
        // Only include promos that have started (or have no start date)
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        // Only include promos that haven't ended (or have no end date)
        or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
      ),
    );

  const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
  };

  const mapPromo = (promo: (typeof promoList)[number]) => ({
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
  });

  const result = promoList.map(mapPromo);
  await cache.set(cache.keys.promotions(), result, cache.TTL.PROMOTIONS);
  return result as any;
};
