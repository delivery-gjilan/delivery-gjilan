import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { canManageUsers } from '@/lib/utils/permissions';

export const deleteUser: NonNullable<MutationResolvers['deleteUser']> = async (_parent, { id }, { authService, userData }) => {
    // Only users with user management permissions can delete users
    if (!canManageUsers(userData)) {
        throw new GraphQLError('Unauthorized: Only super admins can delete users', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // Prevent deleting yourself
    if (id === userData.userId) {
        throw new GraphQLError('Cannot delete your own account', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    // Delete the user
    const deleted = await authService.authRepository.deleteUser(id);

    if (!deleted) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return true;
};