import type { QueryResolvers } from './../../../../generated/types.generated';
export const products: NonNullable<QueryResolvers['products']> = async (
    _parent,
    { businessId },
    { productService },
) => {
    return productService.getProducts(businessId);
};
