import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { canViewUserData } from '@/lib/utils/permissions';

export const updateUserNote: NonNullable<MutationResolvers['updateUserNote']> = async (_parent, { userId, note, flagColor }, { authService, userData }) => {
    // Only users with permission to view user data can update notes
    if (!canViewUserData(userData)) {
        throw new GraphQLError('Unauthorized: Only admins can update user notes', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') {
        if (!userData.businessId) {
            throw new GraphQLError('Business user must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        const targetUser = await authService.getUserById(userId);
        if (!targetUser) {
            throw new GraphQLError('User not found', {
                extensions: { code: 'NOT_FOUND' },
            });
        }

        if (targetUser.businessId !== userData.businessId) {
            throw new GraphQLError('You can only update notes for users in your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }

    // Update the user's admin note
    const updatedUser = await authService.authRepository.updateUser(userId, {
        adminNote: note || null,
        flagColor: note ? (flagColor || 'yellow') : null,
    });

    if (!updatedUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return updatedUser;
};