import type { MutationResolvers } from './../../../../generated/types.generated';
export const deleteProduct: NonNullable<MutationResolvers['deleteProduct']> = async (
    _parent,
    { id },
    { productService },
) => {
    return productService.deleteProduct(id);
};
