import type { MutationResolvers } from '@/generated/types.generated';

export const login: NonNullable<MutationResolvers['login']> = async (_parent, { input }, { authService }) => {
    const result = await authService.login(input.email, input.password);
    
    // Return the full user object so GraphQL can resolve all fields including driverConnection
    return {
        token: result.token,
        refreshToken: result.refreshToken ?? null,
        user: result.user as any, // Let GraphQL resolve all fields
        message: result.message,
    };
};
