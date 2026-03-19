import type { MutationResolvers } from '@/generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { cache } from '@/lib/cache';
import { GraphQLError } from 'graphql';
import { canManageBusinesses } from '@/lib/utils/permissions';

export const createBusiness: NonNullable<MutationResolvers['createBusiness']> = async (
    _parent,
    { input },
    context,
) => {
    const { businessService, db, userData } = context;

    if (!canManageBusinesses(userData)) {
        throw new GraphQLError('Unauthorized: Only super admins can create businesses', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

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
            businessType: input.businessType,
            phoneNumber: input.phoneNumber,
        },
    });
    
    return result;
};
