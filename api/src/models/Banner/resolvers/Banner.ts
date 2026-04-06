import type { BannerResolvers } from './../../../generated/types.generated';

export const Banner: BannerResolvers = {
  business: async (parent, _args, { loaders }) => {
    if (!parent.businessId) return null;
    return loaders.businessByIdLoader.load(parent.businessId as string) as any;
  },

  product: async (parent, _args, { loaders }) => {
    if (!parent.productId) return null;
    return loaders.productByIdLoader.load(parent.productId as string) as any;
  },

  promotion: async (parent, _args, { loaders }) => {
    if (!parent.promotionId) return null;
    return loaders.promotionByIdLoader.load(parent.promotionId as string) as any;
  },
};