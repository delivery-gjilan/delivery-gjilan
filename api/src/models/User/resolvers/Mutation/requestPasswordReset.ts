import type { MutationResolvers } from '@/generated/types.generated';

export const requestPasswordReset: NonNullable<MutationResolvers['requestPasswordReset']> = async (
    _parent,
    { email },
    { authService, emailService },
) => {
    return authService.requestPasswordReset(email, emailService);
};
