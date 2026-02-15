import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';

export const createProduct: NonNullable<MutationResolvers['createProduct']> = async (
    _parent,
    { input },
    context,
) => {
    const { productService, db } = context;
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
