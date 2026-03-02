import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const createProductSubcategory: NonNullable<MutationResolvers['createProductSubcategory']> = async (
        _parent,
        { input },
        { productSubcategoryService, productCategoryService },
) => {
        const result = await productSubcategoryService.createProductSubcategory(input);
        // Invalidate by categoryId + parent business
        const category = await productCategoryService.getProductCategory(input.categoryId);
        if (category) {
                await cache.invalidateSubcategories(category.businessId, input.categoryId);
        }
        return result;
};