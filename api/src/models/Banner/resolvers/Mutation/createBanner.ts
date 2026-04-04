import type { MutationResolvers } from './../../../../generated/types.generated';

export const createBanner: NonNullable<MutationResolvers['createBanner']> = async (_parent, args, ctx) => {
  const { input } = args;

  const banner = await ctx.bannerRepository.create({
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
    sortOrder: input.sortOrder ?? undefined,
    isActive: input.isActive ?? true,
  });

  return banner as any;
};