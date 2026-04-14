import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const banUser: NonNullable<MutationResolvers['banUser']> = async (
    _parent,
    { userId, banned },
    { authService, userData },
) => {
    // Only SUPER_ADMIN can ban/unban users
    if (userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Unauthorized: Only super admins can ban or unban users', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // Prevent banning yourself
    if (userId === userData.userId) {
        throw new GraphQLError('Cannot ban your own account', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const targetUser = await authService.getUserById(userId);
    if (!targetUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    // Only customers can be banned
    if (targetUser.role !== 'CUSTOMER') {
        throw new GraphQLError('Only customer accounts can be banned', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const updatedUser = await authService.authRepository.updateUser(userId, {
        isBanned: banned,
    });

    if (!updatedUser) {
        throw new GraphQLError('Failed to update user', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }

    return updatedUser;
};
