// @ts-nocheck
import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const deleteMyAccount: NonNullable<MutationResolvers['deleteMyAccount']> = async (
    _parent,
    _args,
    { authService, userData }
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }

    const deleted = await authService.authRepository.deleteUser(userData.userId);

    if (!deleted) {
        throw new GraphQLError('Account not found or already deleted', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return true;
};