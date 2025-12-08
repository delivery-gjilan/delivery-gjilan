import type { MutationResolvers } from '@/generated/types.generated';

export const submitPhoneNumber: NonNullable<MutationResolvers['submitPhoneNumber']> = async (
    _parent,
    { input },
    { authService, userData },
) => {
    const userId = userData?.userId as string;

    const result = await authService.submitPhoneNumber(userId, input.phoneNumber);
    return {
        userId: result.userId,
        currentStep: result.currentStep,
        message: result.message,
    };
};
