import type { QueryResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq, asc } from 'drizzle-orm';

export const getBanners: NonNullable<QueryResolvers['getBanners']> = async (_parent, args, _ctx) => {
  const { activeOnly } = args;

  let query = db.select().from(banners).orderBy(asc(banners.sortOrder));

  if (activeOnly) {
    query = query.where(eq(banners.isActive, true)) as any;
  }

  const result = await query;
  return result as any;
};