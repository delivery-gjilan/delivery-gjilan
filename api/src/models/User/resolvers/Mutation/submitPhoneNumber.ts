import type { MutationResolvers } from '@/generated/types.generated';

export const submitPhoneNumber: NonNullable<MutationResolvers['submitPhoneNumber']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.submitPhoneNumber(input.userId, input.phoneNumber);
    return {
        userId: result.userId,
        currentStep: result.currentStep as 'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED',
        message: result.message,
    };
};
