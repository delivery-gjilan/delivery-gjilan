import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';

export const updateBusiness: NonNullable<MutationResolvers['updateBusiness']> = async (
    _parent,
    { id, input },
    context,
) => {
    const { businessService, db } = context;
    const oldBusiness = await businessService.getBusiness(id);
    const result = await businessService.updateBusiness(id, input);
    
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
