import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const updateProductSubcategory: NonNullable<MutationResolvers['updateProductSubcategory']> = async (
        _parent,
        { id, input },
        { productSubcategoryService },
) => {
        const result = await productSubcategoryService.updateProductSubcategory(id, input);
        // Invalidate by categoryId
        await cache.invalidateSubcategories('', result.categoryId);
        // Also invalidate the by-business pattern
        await cache.delPattern('cache:subcategories:*');
        return result;
};