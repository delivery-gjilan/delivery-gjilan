import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteProductSubcategory: NonNullable<MutationResolvers['deleteProductSubcategory']> = async (
        _parent,
        { id },
        { productSubcategoryService },
) => {
        return productSubcategoryService.deleteProductSubcategory(id);
};