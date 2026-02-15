import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';

export const deleteProduct: NonNullable<MutationResolvers['deleteProduct']> = async (
    _parent,
    { id },
    context,
) => {
    const { productService, db } = context;
    const product = await productService.getProduct(id);
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
