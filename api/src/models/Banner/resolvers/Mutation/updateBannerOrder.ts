import type { MutationResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq } from 'drizzle-orm';

export const updateBannerOrder: NonNullable<MutationResolvers['updateBannerOrder']> = async (_parent, args, _ctx) => {
  const { bannerId, newSortOrder } = args;

  const [banner] = await db
    .update(banners)
    .set({ sortOrder: newSortOrder, updatedAt: new Date() })
    .where(eq(banners.id, bannerId))
    .returning();

  return banner as any;
};