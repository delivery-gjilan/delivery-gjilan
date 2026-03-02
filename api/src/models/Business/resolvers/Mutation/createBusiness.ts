import type { MutationResolvers } from '@/generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { cache } from '@/lib/cache';

export const createBusiness: NonNullable<MutationResolvers['createBusiness']> = async (
    _parent,
    { input },
    context,
) => {
    const { businessService, db } = context;
    const result = await businessService.createBusiness(input);
    
    // Invalidate businesses list cache
    await cache.invalidateAllBusinesses();
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'BUSINESS_CREATED',
        entityType: 'BUSINESS',
        entityId: result.id,
        metadata: {
            name: input.name,
            category: input.category,
            phoneNumber: input.phoneNumber,
        },
    });
    
    return result;
};
