import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { toUserParent } from '../utils/toUserParent';

export const setMyEmailOptOut: NonNullable<MutationResolvers['setMyEmailOptOut']> = async (
        _parent,
        { optOut },
        { authService, userData },
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', {
                        extensions: { code: 'UNAUTHORIZED' },
                });
        }

        const updatedUser = await authService.authRepository.updateUser(userData.userId, {
                emailOptOut: optOut,
        });

        if (!updatedUser) {
                throw new GraphQLError('User not found', {
                        extensions: { code: 'NOT_FOUND' },
                });
        }

        return toUserParent(updatedUser);
};