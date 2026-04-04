import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateBannerOrder: NonNullable<MutationResolvers['updateBannerOrder']> = async (_parent, args, ctx) => {
  const { bannerId, newSortOrder } = args;

  const banner = await ctx.bannerRepository.updateSortOrder(bannerId, newSortOrder);

  return banner as any;
};