import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateBanner: NonNullable<MutationResolvers['updateBanner']> = async (_parent, args, ctx) => {
  const { id, input } = args;

  const updateData: any = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
  if (input.imageUrl) updateData.imageUrl = input.imageUrl;
  if (input.mediaType !== undefined) updateData.mediaType = input.mediaType;
  if (input.businessId !== undefined) updateData.businessId = input.businessId;
  if (input.productId !== undefined) updateData.productId = input.productId;
  if (input.promotionId !== undefined) updateData.promotionId = input.promotionId;
  if (input.linkType !== undefined) updateData.linkType = input.linkType;
  if (input.linkTarget !== undefined) updateData.linkTarget = input.linkTarget;
  if (input.displayContext !== undefined) updateData.displayContext = input.displayContext;
  if (input.startsAt !== undefined) updateData.startsAt = input.startsAt;
  if (input.endsAt !== undefined) updateData.endsAt = input.endsAt;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const banner = await ctx.bannerRepository.update(id, updateData);

  return banner as any;
};