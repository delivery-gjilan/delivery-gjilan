
import type { MutationResolvers } from './../../../../generated/types.generated';
import { hasPermission, isPlatformAdmin } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';

export const setBusinessSchedule: NonNullable<MutationResolvers['setBusinessSchedule']> = async (
    _parent,
    { businessId, schedule },
    ctx,
) => {
    const { userId, role, businessId: userBusinessId } = ctx;

    if (!role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (isPlatformAdmin(role)) {
        // allowed
    } else if (role === 'BUSINESS_OWNER') {
        if (!userBusinessId || businessId !== userBusinessId) {
            throw new GraphQLError('You can only manage settings for your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (role === 'BUSINESS_EMPLOYEE') {
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
    } else {
        throw new GraphQLError('You do not have permission to manage business settings', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    
    return ctx.businessService.setBusinessSchedule(businessId, schedule).then(async (result) => {
        await cache.invalidateBusiness(businessId);
        return result;
    });
};