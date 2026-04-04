import type { QueryResolvers } from './../../../../generated/types.generated';

export const getBanner: NonNullable<QueryResolvers['getBanner']> = async (_parent, args, ctx) => {
  const { id } = args;

  const banner = await ctx.bannerRepository.findByIdIncludingDeleted(id);

  return banner || null;
};