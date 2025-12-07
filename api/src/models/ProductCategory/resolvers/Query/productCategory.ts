import type { QueryResolvers } from './../../../../generated/types.generated';
export const productCategory: NonNullable<QueryResolvers['productCategory']> = async (
    _parent,
    { id },
    { productCategoryService },
) => {
    return productCategoryService.getProductCategory(id);
};
