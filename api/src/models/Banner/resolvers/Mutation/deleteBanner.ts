import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const deleteBanner: NonNullable<MutationResolvers['deleteBanner']> = async (_parent, args, ctx) => {
  const { id } = args;

  await ctx.bannerRepository.delete(id);
  await cache.invalidateBanners();

  return true;
};