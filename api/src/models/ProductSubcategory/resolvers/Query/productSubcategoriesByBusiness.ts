import type { QueryResolvers } from './../../../../generated/types.generated';

export const productSubcategoriesByBusiness: NonNullable<QueryResolvers['productSubcategoriesByBusiness']> = async (
    _parent,
    { businessId },
    { productSubcategoryService },
) => {
    return productSubcategoryService.getProductSubcategoriesByBusiness(businessId);
};
