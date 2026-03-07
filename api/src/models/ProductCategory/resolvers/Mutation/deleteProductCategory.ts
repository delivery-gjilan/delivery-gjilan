// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const deleteProductCategory: NonNullable<MutationResolvers['deleteProductCategory']> = async (
    _parent,
    { id },
    { productCategoryService },
) => {
    // Get the category first to know the businessId for invalidation
    const category = await productCategoryService.getProductCategory(id);
    const result = await productCategoryService.deleteProductCategory(id);
    if (category) {
        await cache.invalidateCategories(category.businessId);
    }
    return result;
};
