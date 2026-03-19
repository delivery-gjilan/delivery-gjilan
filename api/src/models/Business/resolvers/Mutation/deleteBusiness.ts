import type { MutationResolvers } from './../../../../generated/types.generated';
import { cache } from '@/lib/cache';
import { GraphQLError } from 'graphql';
import { isPlatformAdmin } from '@/lib/utils/permissions';

export const deleteBusiness: NonNullable<MutationResolvers['deleteBusiness']> = async (
    _parent,
    { id },
    { businessService, role, businessId },
) => {
    if (!role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (!isPlatformAdmin(role)) {
        if (role !== 'BUSINESS_OWNER' || !businessId || id !== businessId) {
            throw new GraphQLError('You do not have permission to delete this business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }

    const result = await businessService.deleteBusiness(id);
    await cache.invalidateBusiness(id);
    return result;
};
