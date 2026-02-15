import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateProductSubcategory: NonNullable<MutationResolvers['updateProductSubcategory']> = async (
        _parent,
        { id, input },
        { productSubcategoryService },
) => {
        return productSubcategoryService.updateProductSubcategory(id, input);
};