import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { canManageUsers } from '@/lib/utils/permissions';

export const setBusinessFeatured: NonNullable<MutationResolvers['setBusinessFeatured']> = async (
    _parent,
    { id, isFeatured, sortOrder },
    { businessService, userData },
) => {
    if (!canManageUsers(userData)) {
        throw new GraphQLError('Unauthorized: Only super admins can manage featured businesses', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    return businessService.setBusinessFeatured(id, isFeatured, sortOrder ?? 0);
};
