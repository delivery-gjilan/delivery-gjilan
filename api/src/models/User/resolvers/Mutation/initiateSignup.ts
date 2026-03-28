import type { MutationResolvers } from '@/generated/types.generated';
import { toUserParent } from '../utils/toUserParent';

export const initiateSignup: NonNullable<MutationResolvers['initiateSignup']> = async (
    _parent,
    { input },
    { authService },
) => {
    const result = await authService.initiateSignup(
        input.firstName,
        input.lastName,
        input.email,
        input.password,
        input.referralCode || undefined
    );
    return {
        token: result.token,
        user: toUserParent(result.user),
        message: result.message,
    };
};
