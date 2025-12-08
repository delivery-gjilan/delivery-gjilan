import type { MutationResolvers } from '@/generated/types.generated';

export const login: NonNullable<MutationResolvers['login']> = async (_parent, { input }, { authService }) => {
    const result = await authService.login(input.email, input.password);
    return {
        token: result.token,
        user: {
            id: result.user.id.toString(),
            email: result.user.email,
            name: result.user.name || null,
            address: result.user.address || null,
            phoneNumber: result.user.phoneNumber || null,
            emailVerified: result.user.emailVerified,
            phoneVerified: result.user.phoneVerified,
            signupStep: result.user.signupStep as
                | 'INITIAL'
                | 'EMAIL_SENT'
                | 'EMAIL_VERIFIED'
                | 'PHONE_SENT'
                | 'COMPLETED',
        },
        message: result.message,
    };
};
