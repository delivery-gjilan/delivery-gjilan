import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, promotionBusinessEligibility } from '@/database/schema/promotions';
import { and, or, isNull, isNotNull, lte, gte, eq } from 'drizzle-orm';

export const getPromotionThresholds: NonNullable<QueryResolvers['getPromotionThresholds']> = async (
  _parent,
  { cart },
  _ctx
) => {
  const now = new Date().toISOString();
  const db = await getDB();

  // Find active promotions with spend thresholds (any target/type)
  const promos = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        eq(promotions.isDeleted, false),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
        or(
          isNull(promotions.maxGlobalUsage),
          promotions.currentGlobalUsage.lt(promotions.maxGlobalUsage)
        ),
        // only those with a spendThreshold
        isNotNull(promotions.spendThreshold)
      )
    );

  const results: Array<any> = [];

  for (const p of promos) {
    const elig = await db
      .select()
      .from(promotionBusinessEligibility)
      .where(eq(promotionBusinessEligibility.promotionId, p.id));

    const eligibleBusinessIds = (elig || []).map((e: any) => e.businessId).filter(Boolean);

    results.push({
      id: p.id,
      name: p.name,
      code: p.code,
      spendThreshold: p.spendThreshold ? Number(p.spendThreshold) : 0,
      eligibleBusinessIds: eligibleBusinessIds.length > 0 ? eligibleBusinessIds : null,
      priority: p.priority,
      isActive: p.isActive,
    });
  }

  return results;
};
