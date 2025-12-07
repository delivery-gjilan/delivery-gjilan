import type { QueryResolvers } from './../../../../generated/types.generated';
export const productCategories: NonNullable<QueryResolvers['productCategories']> = async (
    _parent,
    { businessId },
    { productCategoryService },
) => {
    return productCategoryService.getProductCategories(businessId);
};
