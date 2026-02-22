import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';

export const createProduct: NonNullable<MutationResolvers['createProduct']> = async (
    _parent,
    { input },
    context,
) => {
    const { productService, db } = context;
    const { userId, role, businessId } = context;
    
    // Check if user has permission to manage products
    if (role === 'BUSINESS_EMPLOYEE') {
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
    }
    
    const result = await productService.createProduct(input);
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: result.id,
        metadata: { name: input.name, businessId: input.businessId },
    });
    
    return result;
};
