import type { MutationResolvers } from '@/generated/types.generated';
import { toUserParent } from '../utils/toUserParent';

export const login: NonNullable<MutationResolvers['login']> = async (_parent, { input }, { authService }) => {
    const result = await authService.login(input.email, input.password);

    return {
        token: result.token,
        refreshToken: result.refreshToken ?? null,
        user: toUserParent(result.user),
        message: result.message,
    };
};
