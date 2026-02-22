import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';

export const deleteProduct: NonNullable<MutationResolvers['deleteProduct']> = async (
    _parent,
    { id },
    context,
) => {
    const { productService, db } = context;
    const { userId, role, businessId } = context;
    const product = await productService.getProduct(id);
    
    // Check if user has permission to manage products
    if (role === 'BUSINESS_EMPLOYEE') {
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
    }
    const result = await productService.deleteProduct(id);
    
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
