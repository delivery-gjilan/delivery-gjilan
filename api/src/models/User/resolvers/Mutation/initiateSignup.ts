import type { MutationResolvers } from '@/generated/types.generated';

export const initiateSignup: NonNullable<MutationResolvers['initiateSignup']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.initiateSignup(input.firstName, input.lastName, input.email, input.password);
    return {
        token: result.token,
        user: result.user,
        message: result.message,
    };
};
