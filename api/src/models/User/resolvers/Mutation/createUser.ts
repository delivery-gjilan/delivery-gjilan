import type { MutationResolvers } from '@/generated/types.generated';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { input }, { authService }) => {
    const result = await authService.createUser(
        input.firstName,
        input.lastName,
        input.email,
        input.password,
        input.role,
    );
    return {
        token: result.token,
        user: result.user,
        message: result.message,
    };
};
