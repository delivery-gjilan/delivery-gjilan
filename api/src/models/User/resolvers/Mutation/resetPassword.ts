import type { MutationResolvers } from '@/generated/types.generated';

export const resetPassword: NonNullable<MutationResolvers['resetPassword']> = async (
    _parent,
    { token, newPassword },
    { authService },
) => {
    return authService.resetPassword(token, newPassword);
};
