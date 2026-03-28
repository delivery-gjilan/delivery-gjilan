import type { MutationResolvers } from './../../../../generated/types.generated';
import { db } from '../../../../../database';
import { banners } from '../../../../../database/schema';
import { eq } from 'drizzle-orm';

export const updateBanner: NonNullable<MutationResolvers['updateBanner']> = async (_parent, args, _ctx) => {
  const { id, input } = args;

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
  if (input.imageUrl) updateData.imageUrl = input.imageUrl;
  if (input.linkType !== undefined) updateData.linkType = input.linkType;
  if (input.linkTarget !== undefined) updateData.linkTarget = input.linkTarget;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [banner] = await db
    .update(banners)
    .set(updateData)
    .where(eq(banners.id, id))
    .returning();

  return banner as any;
};