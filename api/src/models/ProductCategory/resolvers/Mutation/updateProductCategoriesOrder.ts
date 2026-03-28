import type { MutationResolvers } from './../../../../generated/types.generated';
import { hasPermission, isPlatformAdmin } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const updateProductCategoriesOrder: NonNullable<
    MutationResolvers['updateProductCategoriesOrder']
> = async (_parent, { businessId, categories }, context) => {
    const { productCategoryService, userId, role, businessId: userBusinessId } = context;

    if (!role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (isPlatformAdmin(role)) {
        // allowed
    } else if (role === 'BUSINESS_OWNER') {
        if (!userBusinessId || businessId !== userBusinessId) {
            throw new GraphQLError('You can only manage categories for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId: userBusinessId }, 'manage_products');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage categories', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (businessId !== userBusinessId) {
            throw new GraphQLError('You can only manage categories for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else {
        throw new GraphQLError('You do not have permission to manage categories', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const result = await productCategoryService.updateProductCategoriesOrder(businessId, categories);
    await cache.invalidateCategories(businessId);
    return result;
};
