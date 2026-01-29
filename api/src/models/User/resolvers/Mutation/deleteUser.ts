import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const deleteUser: NonNullable<MutationResolvers['deleteUser']> = async (_parent, { id }, { authService, userData }) => {
    // Only SUPER_ADMIN can delete users
    if (userData.role !== 'SUPER_ADMIN') {
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