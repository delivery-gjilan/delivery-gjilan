import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteProductVariantGroup: NonNullable<MutationResolvers['deleteProductVariantGroup']> = async (
    _parent,
    { id },
    { productService },
) => {
    return productService.deleteVariantGroup(id);
};
