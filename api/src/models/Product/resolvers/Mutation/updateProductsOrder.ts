import type { MutationResolvers } from './../../../../generated/types.generated';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const updateProductsOrder: NonNullable<MutationResolvers['updateProductsOrder']> = async (
    _parent,
    { businessId, products },
    context,
) => {
    const { productService, userId, role, businessId: userBusinessId } = context;
    
    // Check if user has permission to manage products
    if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId: userBusinessId }, 'manage_products');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage products', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        
        // Business employees can only manage products for their own business
        if (businessId !== userBusinessId) {
            throw new GraphQLError('You can only manage products for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }
    
    const result = await productService.updateProductsOrder(businessId, products);
    await cache.invalidateProducts(businessId);
    return result;
};