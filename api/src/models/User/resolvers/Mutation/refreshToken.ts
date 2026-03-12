
import type { MutationResolvers } from '@/generated/types.generated';

export const refreshToken: NonNullable<MutationResolvers['refreshToken']> = async (_parent, { refreshToken }, { authService }) => {
        return authService.refreshAccessToken(refreshToken);
};