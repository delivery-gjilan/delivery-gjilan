import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { canManageUsers } from '@/lib/utils/permissions';

export const deleteUser: NonNullable<MutationResolvers['deleteUser']> = async (_parent, { id }, { authService, userData }) => {
    // Prevent deleting yourself
    if (id === userData.userId) {
        throw new GraphQLError('Cannot delete your own account', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    // SUPER_ADMIN can delete any user.
    // BUSINESS_OWNER can only delete BUSINESS_EMPLOYEE users in their own business.
    if (!canManageUsers(userData as any)) {
        if (userData.role !== 'BUSINESS_OWNER') {
            throw new GraphQLError('Unauthorized: Only super admins and business owners can delete users', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (!userData.businessId) {
            throw new GraphQLError('Business owner must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        const targetUser = await authService.getUserById(id);
        if (!targetUser) {
            throw new GraphQLError('User not found', {
                extensions: { code: 'NOT_FOUND' },
            });
        }

        if (targetUser.role !== 'BUSINESS_EMPLOYEE' || targetUser.businessId !== userData.businessId) {
            throw new GraphQLError('Business owners can only delete employees in their own business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
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