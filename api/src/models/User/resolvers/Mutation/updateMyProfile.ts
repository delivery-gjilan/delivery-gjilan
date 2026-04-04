import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { toUserParent } from '../utils/toUserParent';

export const updateMyProfile: NonNullable<MutationResolvers['updateMyProfile']> = async (
    _parent,
    { input },
    { authService, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const { firstName, lastName, phoneNumber } = input;

    const updatedUser = await authService.authRepository.updateUser(userData.userId, {
        firstName,
        lastName,
        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
    });

    if (!updatedUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return toUserParent(updatedUser);
};