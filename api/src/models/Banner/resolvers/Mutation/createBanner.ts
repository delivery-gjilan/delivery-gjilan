import type { MutationResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { sql } from 'drizzle-orm';

export const createBanner: NonNullable<MutationResolvers['createBanner']> = async (_parent, args, _ctx) => {
  const { input } = args;

  // Get the highest sort order and increment
  const [maxOrder] = await db
    .select({ max: sql<number>`COALESCE(MAX(${banners.sortOrder}), -1)` })
    .from(banners);

  const [banner] = await db
    .insert(banners)
    .values({
      title: input.title || null,
      subtitle: input.subtitle || null,
      imageUrl: input.imageUrl,
      mediaType: input.mediaType || 'IMAGE',
      businessId: input.businessId || null,
      productId: input.productId || null,
      promotionId: input.promotionId || null,
      linkType: input.linkType || null,
      linkTarget: input.linkTarget || null,
      displayContext: input.displayContext || 'HOME',
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
      sortOrder: input.sortOrder ?? (maxOrder.max + 1),
      isActive: input.isActive ?? true,
    })
    .returning();

  return banner as any;
};