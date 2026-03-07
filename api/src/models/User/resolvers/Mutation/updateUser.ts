// @ts-nocheck
import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { canManageUsers } from '@/lib/utils/permissions';

export const updateUser: NonNullable<MutationResolvers['updateUser']> = async (_parent, { input }, { authService, userData }) => {
    // Only users with user management permissions can update users
    if (!canManageUsers(userData)) {
        throw new GraphQLError('Unauthorized: Only super admins can update users', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const { id, firstName, lastName, role, businessId } = input;

    // Update the user
    const updatedUser = await authService.authRepository.updateUser(id, {
        firstName,
        lastName,
        role,
        businessId: businessId || null,
    });

    if (!updatedUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return updatedUser;
};