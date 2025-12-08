import type { MutationResolvers } from '@/generated/types.generated';

export const initiateSignup: NonNullable<MutationResolvers['initiateSignup']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.initiateSignup(input.email, input.password);
    return {
        userId: result.userId.toString(),
        currentStep: result.currentStep as 'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED',
        message: result.message,
    };
};
