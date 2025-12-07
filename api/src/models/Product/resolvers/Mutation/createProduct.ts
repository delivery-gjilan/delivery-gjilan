import type { MutationResolvers } from './../../../../generated/types.generated';
export const createProduct: NonNullable<MutationResolvers['createProduct']> = async (
    _parent,
    { input },
    { productService },
) => {
    return productService.createProduct(input);
};
