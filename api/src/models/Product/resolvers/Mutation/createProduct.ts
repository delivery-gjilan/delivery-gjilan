import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { hasPermission, isPlatformAdmin } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const createProduct: NonNullable<MutationResolvers['createProduct']> = async (
    _parent,
    { input },
    context,
) => {
    const { productService, db } = context;
    const { userId, role, businessId } = context;

    if (!role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (isPlatformAdmin(role)) {
        // allowed
    } else if (role === 'BUSINESS_OWNER') {
        if (!businessId || input.businessId !== businessId) {
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
        if (input.businessId !== businessId) {
            throw new GraphQLError('You can only manage products for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else {
        throw new GraphQLError('You do not have permission to manage products', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (input.isOffer && !isPlatformAdmin(role)) {
        throw new GraphQLError('Only admins can create deals/offers', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    
    const result = await productService.createProduct(input);
    await cache.invalidateProducts(input.businessId, result.id as string);
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: result.id as string,
        metadata: { name: input.name, businessId: input.businessId },
    });
    
    return result as any;
};
