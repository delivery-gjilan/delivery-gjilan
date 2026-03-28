import type { QueryResolvers } from './../../../../generated/types.generated';

export const offers: NonNullable<QueryResolvers['offers']> = async (_parent, { businessId }, { productService }) => {
    return productService.getOffers(businessId);
};
