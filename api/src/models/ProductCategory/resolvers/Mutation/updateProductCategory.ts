import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const updateProductCategory: NonNullable<MutationResolvers['updateProductCategory']> = async (
    _parent,
    { id, input },
    { productCategoryService },
) => {
    const result = await productCategoryService.updateProductCategory(id as string, input);
    // Invalidate the business's categories cache
    await cache.invalidateCategories(result.businessId as string);
    return result as any;
};
