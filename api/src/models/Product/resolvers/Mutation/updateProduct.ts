// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger, createChangeMetadata } from '@/services/AuditLogger';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';

export const updateProduct: NonNullable<MutationResolvers['updateProduct']> = async (
    _parent,
    { id, input },
    context,
) => {
    const { productService, db } = context;
    const { userId, role, businessId } = context;
    const oldProduct = await productService.getProduct(id);
    
    // Check if user has permission to manage products
    if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId }, 'manage_products');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage products', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        
        // Business employees can only manage products for their own business
        if (oldProduct?.businessId !== businessId) {
            throw new GraphQLError('You can only manage products for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }
    const result = await productService.updateProduct(id, input);
    
    // Determine specific action based on what changed
    let action: any = 'PRODUCT_UPDATED';
    if (input.isAvailable !== undefined && oldProduct?.isAvailable !== input.isAvailable) {
        action = 'PRODUCT_AVAILABILITY_CHANGED';
    } else if (input.price !== undefined || input.salePrice !== undefined) {
        action = 'PRODUCT_PRICE_CHANGED';
    }
    
    // Log the action with proper old/new values
    const logger = createAuditLogger(db, context);
    
    // Create metadata with only changed fields
    const changedFields = Object.keys(input);
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    
    changedFields.forEach(field => {
        if (oldProduct && field in oldProduct) {
            oldValues[field] = (oldProduct as any)[field];
        }
        newValues[field] = (input as any)[field];
    });
    
    await logger.log({
        action,
        entityType: 'PRODUCT',
        entityId: id,
        metadata: {
            name: result.name, // Always include product name for context
            oldValue: oldValues,
            newValue: newValues,
            changedFields,
        },
    });
    
    return result;
};
