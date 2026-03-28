import type { QueryResolvers } from './../../../../generated/types.generated';

export const productSubcategories: NonNullable<QueryResolvers['productSubcategories']> = async (
    _parent,
    { categoryId },
    { productSubcategoryService },
) => {
    return productSubcategoryService.getProductSubcategories(categoryId);
};
