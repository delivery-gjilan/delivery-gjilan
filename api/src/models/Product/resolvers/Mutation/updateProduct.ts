import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger, createChangeMetadata } from '@/services/AuditLogger';

export const updateProduct: NonNullable<MutationResolvers['updateProduct']> = async (
    _parent,
    { id, input },
    context,
) => {
    const { productService, db } = context;
    const oldProduct = await productService.getProduct(id);
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
