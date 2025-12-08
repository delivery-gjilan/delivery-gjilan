import type { MutationResolvers } from '@/generated/types.generated';

export const verifyPhone: NonNullable<MutationResolvers['verifyPhone']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.verifyPhone(input.userId, input.code);
    return {
        userId: result.userId,
        currentStep: result.currentStep as 'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED',
        message: result.message,
    };
};
