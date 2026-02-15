import type { MutationResolvers } from './../../../../generated/types.generated';

export const createProductSubcategory: NonNullable<MutationResolvers['createProductSubcategory']> = async (
        _parent,
        { input },
        { productSubcategoryService },
) => {
        return productSubcategoryService.createProductSubcategory(input);
};