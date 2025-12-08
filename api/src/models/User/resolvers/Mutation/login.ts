import type { MutationResolvers } from '@/generated/types.generated';

export const login: NonNullable<MutationResolvers['login']> = async (_parent, { input }, { authService }) => {
    const result = await authService.login(input.email, input.password);
    return {
        token: result.token,
        user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            address: result.user.address || null,
            phoneNumber: result.user.phoneNumber || null,
            emailVerified: result.user.emailVerified,
            phoneVerified: result.user.phoneVerified,
            signupStep: result.user.signupStep,
        },
        message: result.message,
    };
};
