import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { input }, { authService, driverService, userData }) => {
    // Only SUPER_ADMIN can create users
    if (userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Unauthorized: Only super admins can create users', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const result = await authService.createUser(
        input.firstName,
        input.lastName,
        input.email,
        input.password,
        input.role,
        input.businessId,
    );

    // If creating a DRIVER user, create their driver profile
    if (input.role === 'DRIVER' && driverService) {
        try {
            await driverService.createDriverProfile(result.user.id);
        } catch (error) {
            console.error(`Failed to create driver profile for ${result.user.id}:`, error);
            // Don't fail the entire request, just log the error
        }
    }

    return {
        token: result.token,
        user: result.user,
        message: result.message,
    };
};
