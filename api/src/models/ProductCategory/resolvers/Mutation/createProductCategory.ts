import type { MutationResolvers } from './../../../../generated/types.generated';
export const createProductCategory: NonNullable<MutationResolvers['createProductCategory']> = async (
    _parent,
    { input },
    { productCategoryService },
) => {
    return productCategoryService.createProductCategory(input);
};
