import type { QueryResolvers } from './../../../../generated/types.generated';

export const getActiveBanners: NonNullable<QueryResolvers['getActiveBanners']> = async (_parent, args, ctx) => {
  const { displayContext } = args;

  const result = await ctx.bannerRepository.findActive(displayContext ?? undefined);

  return result as any;
};
