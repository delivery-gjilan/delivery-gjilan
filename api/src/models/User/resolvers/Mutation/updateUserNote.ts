import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const updateUserNote: NonNullable<MutationResolvers['updateUserNote']> = async (_parent, { userId, note, flagColor }, { authService, userData }) => {
    // Only SUPER_ADMIN and BUSINESS_ADMIN can update user notes
    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'BUSINESS_ADMIN') {
        throw new GraphQLError('Unauthorized: Only admins can update user notes', {
            extensions: { code: 'FORBIDDEN' },
        });
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