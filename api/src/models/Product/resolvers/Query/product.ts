import type { QueryResolvers } from './../../../../generated/types.generated';
export const product: NonNullable<QueryResolvers['product']> = async (_parent, { id }, { productService }) => {
    return productService.getProduct(id);
};
