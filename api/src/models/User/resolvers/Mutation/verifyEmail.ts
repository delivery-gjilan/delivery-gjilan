import type { MutationResolvers } from '@/generated/types.generated';

export const verifyEmail: NonNullable<MutationResolvers['verifyEmail']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.verifyEmail(input.userId, input.code);
    return {
        userId: result.userId,
        currentStep: result.currentStep,
        message: result.message,
    };
};
