import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateProductsOrder: NonNullable<MutationResolvers['updateProductsOrder']> = async (
    _parent,
    { businessId, products },
    { productService },
) => {
    return productService.updateProductsOrder(businessId, products);
};