import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { hasPermission, isPlatformAdmin } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const deleteProduct: NonNullable<MutationResolvers['deleteProduct']> = async (
    _parent,
    { id },
    context,
) => {
    const { productService, db } = context;
    const { userId, role, businessId } = context;
    const product = await productService.getProduct(id);

    if (!role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (!product) {
        throw new GraphQLError('Product not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    if (isPlatformAdmin(role)) {
        // allowed
    } else if (role === 'BUSINESS_OWNER') {
        if (!businessId || product.businessId !== businessId) {
            throw new GraphQLError('You can only manage products for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId }, 'manage_products');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage products', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        
        // Business employees can only manage products for their own business
        if (product?.businessId !== businessId) {
            throw new GraphQLError('You can only manage products for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else {
        throw new GraphQLError('You do not have permission to manage products', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const result = await productService.deleteProduct(id);
    if (product?.businessId) {
        await cache.invalidateProducts(product.businessId, id);
    }
    
    // Log the action
    if (result && product) {
        const logger = createAuditLogger(db, context);
        await logger.log({
            action: 'PRODUCT_DELETED',
            entityType: 'PRODUCT',
            entityId: id,
            metadata: { name: product.name, businessId: product.businessId },
        });
    }
    
    return result;
};
