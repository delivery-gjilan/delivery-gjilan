import type { MutationResolvers } from './../../../../generated/types.generated';
export const updateProductCategory: NonNullable<MutationResolvers['updateProductCategory']> = async (
    _parent,
    { id, input },
    { productCategoryService },
) => {
    return productCategoryService.updateProductCategory(id, input);
};
