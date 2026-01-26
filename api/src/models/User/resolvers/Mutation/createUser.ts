import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { input }, { authService, userData }) => {
    // Only SUPER_ADMIN can create users
    if (userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Unauthorized: Only super admins can create users', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const result = await authService.createUser(
        input.firstName,
        input.lastName,
        input.email,
        input.password,
        input.role,
        input.businessId,
    );
    return {
        token: result.token,
        user: result.user,
        message: result.message,
    };
};
