import type { MutationResolvers } from '@/generated/types.generated';

export const verifyEmail: NonNullable<MutationResolvers['verifyEmail']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.verifyEmail(input.userId, input.code);
    return {
        userId: result.userId,
        currentStep: result.currentStep as 'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED',
        message: result.message,
    };
};
