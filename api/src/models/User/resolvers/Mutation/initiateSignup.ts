import type { MutationResolvers } from '@/generated/types.generated';

export const initiateSignup: NonNullable<MutationResolvers['initiateSignup']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.initiateSignup(input.firstName, input.lastName, input.email, input.password);
    return {
        userId: result.userId,
        currentStep: result.currentStep,
        message: result.message,
    };
};
