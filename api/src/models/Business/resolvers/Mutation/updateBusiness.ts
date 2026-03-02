import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const updateBusiness: NonNullable<MutationResolvers['updateBusiness']> = async (
    _parent,
    { id, input },
    context,
) => {
    const { businessService, db } = context;
    const { userId, role, businessId } = context;
    
    // Check if user has permission to manage business settings
    if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId }, 'manage_settings');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage business settings', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        
        // Business employees can only manage their own business
        if (id !== businessId) {
            throw new GraphQLError('You can only manage your own business settings', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }
    
    const oldBusiness = await businessService.getBusiness(id);
    const result = await businessService.updateBusiness(id, input);
    
    // Invalidate cache for this business + list
    await cache.invalidateBusiness(id);
    
    // Create metadata with changed fields
    const changedFields = Object.keys(input);
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    
    changedFields.forEach(field => {
        if (oldBusiness && field in oldBusiness) {
            oldValues[field] = (oldBusiness as any)[field];
        }
        newValues[field] = (input as any)[field];
    });
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'BUSINESS_UPDATED',
        entityType: 'BUSINESS',
        entityId: id,
        metadata: {
            name: result.name,
            oldValue: oldValues,
            newValue: newValues,
            changedFields,
        },
    });
    
    return result;
};
