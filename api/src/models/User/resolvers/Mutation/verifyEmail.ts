import type { MutationResolvers } from '@/generated/types.generated';

export const verifyEmail: NonNullable<MutationResolvers['verifyEmail']> = async (
    _parent,
    { input },
    { authService, userData },
) => {
    const userId = userData?.userId as string;
    const result = await authService.verifyEmail(userId, input.code);
    return {
        userId: result.userId,
        currentStep: result.currentStep,
        message: result.message,
    };
};
