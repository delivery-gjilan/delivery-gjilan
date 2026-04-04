import type { QueryResolvers } from './../../../../generated/types.generated';

export const getBanners: NonNullable<QueryResolvers['getBanners']> = async (_parent, args, ctx) => {
  const { filter } = args;

  const result = await ctx.bannerRepository.findAll({
    activeOnly: filter?.activeOnly ?? undefined,
    businessId: filter?.businessId ?? undefined,
    productId: filter?.productId ?? undefined,
    promotionId: filter?.promotionId ?? undefined,
    displayContext: filter?.displayContext ?? undefined,
    includeScheduled: filter?.includeScheduled ?? undefined,
  });

  return result as any;
};