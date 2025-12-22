import type { MutationResolvers } from '@/generated/types.generated';

export const resendEmailVerification: NonNullable<MutationResolvers['resendEmailVerification']> = async (
    _parent,
    _args,
    { authService, userData },
) => {
    const userId = userData?.userId as string;
    const result = await authService.resendEmailVerification(userId);
    return {
        userId: result.userId,
        currentStep: result.currentStep,
        message: result.message,
    };
};
