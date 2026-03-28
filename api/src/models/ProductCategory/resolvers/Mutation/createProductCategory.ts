import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';

export const createProductCategory: NonNullable<MutationResolvers['createProductCategory']> = async (
    _parent,
    { input },
    { productCategoryService },
) => {
    const result = await productCategoryService.createProductCategory(input);
    await cache.invalidateCategories(input.businessId);
    return result;
};
