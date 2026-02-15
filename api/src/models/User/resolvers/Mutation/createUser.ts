import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAuditLogger } from '@/services/AuditLogger';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { input }, context) => {
    const { authService, driverService, userData, db } = context;
    
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
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: input.role === 'DRIVER' ? 'DRIVER_CREATED' : 'USER_CREATED',
        entityType: 'USER',
        entityId: result.user.id,
        metadata: { 
            email: input.email, 
            role: input.role,
            firstName: input.firstName,
            lastName: input.lastName,
        },
    });

    return {
        token: result.token,
        user: result.user,
        message: result.message,
    };
};
