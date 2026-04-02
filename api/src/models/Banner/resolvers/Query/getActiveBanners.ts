import type { QueryResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq, asc, and, lte, gte, or, isNull } from 'drizzle-orm';

export const getActiveBanners: NonNullable<QueryResolvers['getActiveBanners']> = async (_parent, args, _ctx) => {
  const { displayContext } = args;
  const now = new Date();

  const conditions = [
    // Must be active
    eq(banners.isActive, true),
    
    // Must match display context or be set to ALL
    displayContext 
      ? or(
          eq(banners.displayContext, displayContext),
          eq(banners.displayContext, 'ALL' as any)
        ) as any
      : eq(banners.displayContext, 'ALL' as any),
    
    // Must be within scheduled time range
    or(
      isNull(banners.startsAt),
      lte(banners.startsAt, now.toISOString())
    ) as any,
    
    or(
      isNull(banners.endsAt),
      gte(banners.endsAt, now.toISOString())
    ) as any,
  ];

  const result = await db
    .select()
    .from(banners)
    .where(and(...conditions) as any)
    .orderBy(asc(banners.sortOrder));

  return result as any;
};
