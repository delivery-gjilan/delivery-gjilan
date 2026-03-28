import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const deleteProductSubcategory: NonNullable<MutationResolvers['deleteProductSubcategory']> = async (
        _parent,
        { id },
        { productSubcategoryService },
) => {
        const result = await productSubcategoryService.deleteProductSubcategory(id);
        // Flush all subcategory caches (we don't have the categoryId after deletion)
        await cache.delPattern('cache:subcategories*');
        return result;
};