
import type { MutationResolvers } from './../../../../generated/types.generated';
import { hasPermission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';

export const setBusinessSchedule: NonNullable<MutationResolvers['setBusinessSchedule']> = async (
    _parent,
    { businessId, schedule },
    ctx,
) => {
    const { userId, role, businessId: userBusinessId } = ctx;
    
    // Check if user has permission to manage business settings
    if (role === 'BUSINESS_EMPLOYEE') {
        const canManage = await hasPermission({ userId, role, businessId: userBusinessId }, 'manage_settings');
        if (!canManage) {
            throw new GraphQLError('You do not have permission to manage business settings', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
        
        // Business employees can only manage their own business
        if (businessId !== userBusinessId) {
            throw new GraphQLError('You can only manage settings for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }
    
    return ctx.businessService.setBusinessSchedule(businessId, schedule);
};