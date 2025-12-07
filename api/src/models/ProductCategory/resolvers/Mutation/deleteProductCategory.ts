import type { MutationResolvers } from './../../../../generated/types.generated';
export const deleteProductCategory: NonNullable<MutationResolvers['deleteProductCategory']> = async (
    _parent,
    { id },
    { productCategoryService },
) => {
    return productCategoryService.deleteProductCategory(id);
};
