import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteBanner: NonNullable<MutationResolvers['deleteBanner']> = async (_parent, args, ctx) => {
  const { id } = args;

  await ctx.bannerRepository.delete(id);

  return true;
};