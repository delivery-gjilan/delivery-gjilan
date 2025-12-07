import type { MutationResolvers } from './../../../../generated/types.generated';
export const updateProduct: NonNullable<MutationResolvers['updateProduct']> = async (
    _parent,
    { id, input },
    { productService },
) => {
    return productService.updateProduct(id, input);
};
