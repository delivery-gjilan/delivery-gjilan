import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const updateBannerOrder: NonNullable<MutationResolvers['updateBannerOrder']> = async (_parent, args, ctx) => {
  const { bannerId, newSortOrder } = args;

  const banner = await ctx.bannerRepository.updateSortOrder(bannerId, newSortOrder);
  await cache.invalidateBanners();

  return banner as any;
};