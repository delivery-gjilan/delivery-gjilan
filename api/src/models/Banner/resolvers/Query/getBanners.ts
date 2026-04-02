import type { QueryResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq, asc, and, lte, gte, or, isNull, sql } from 'drizzle-orm';

export const getBanners: NonNullable<QueryResolvers['getBanners']> = async (_parent, args, _ctx) => {
  const { filter } = args;

  const conditions = [];

  // Filter by active status
  if (filter?.activeOnly) {
    conditions.push(eq(banners.isActive, true));
  }

  // Filter by business
  if (filter?.businessId) {
    conditions.push(eq(banners.businessId, filter.businessId));
  }

  // Filter by product
  if (filter?.productId) {
    conditions.push(eq(banners.productId, filter.productId));
  }

  // Filter by promotion
  if (filter?.promotionId) {
    conditions.push(eq(banners.promotionId, filter.promotionId));
  }

  // Filter by display context
  if (filter?.displayContext) {
    conditions.push(
      or(
        eq(banners.displayContext, filter.displayContext),
        eq(banners.displayContext, 'ALL' as any)
      ) as any
    );
  }

  // Filter by scheduled time (only show banners that are currently active based on start/end dates)
  if (filter?.includeScheduled) {
    const now = new Date();
    conditions.push(
      or(
        // No start date set OR start date is in the past
        isNull(banners.startsAt),
        lte(banners.startsAt, now.toISOString())
      ) as any,
      or(
        // No end date set OR end date is in the future
        isNull(banners.endsAt),
        gte(banners.endsAt, now.toISOString())
      ) as any
    );
  }

  let query = db.select().from(banners);

  if (conditions.length > 0) {
    query = query.where(and(...conditions) as any) as any;
  }

  query = query.orderBy(asc(banners.sortOrder)) as any;

  const result = await query;
  return result as any;
};