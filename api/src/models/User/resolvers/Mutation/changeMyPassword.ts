import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { comparePassword, hashPassword } from '@/lib/utils/authUtils';

export const changeMyPassword: NonNullable<MutationResolvers['changeMyPassword']> = async (
    _parent,
    { currentPassword, newPassword },
    { authService, userData },
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }

    if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new GraphQLError('New password must be at least 8 characters, include an uppercase letter and a number', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const user = await authService.authRepository.findById(userData.userId);
    if (!user) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    const isCurrentValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentValid) {
        throw new GraphQLError('Current password is incorrect', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const hashed = await hashPassword(newPassword);
    await authService.authRepository.updatePassword(user.id, hashed);

    return true;
};
