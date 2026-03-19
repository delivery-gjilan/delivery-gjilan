import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { canManageUsers } from '@/lib/utils/permissions';

export const createUser: NonNullable<MutationResolvers['createUser']> = async (_parent, { input }, context) => {
    const { authService, driverService, userData, db } = context;

    // SUPER_ADMIN can create any role.
    // BUSINESS_OWNER can only create BUSINESS_EMPLOYEE in their own business.
    if (!canManageUsers(userData)) {
        if (userData.role !== 'BUSINESS_OWNER') {
            throw new GraphQLError('Unauthorized: Only super admins and business owners can create users', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (!userData.businessId) {
            throw new GraphQLError('Business owner must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (input.role !== 'BUSINESS_EMPLOYEE') {
            throw new GraphQLError('Business owners can only create business employees', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (!input.businessId || input.businessId !== userData.businessId) {
            throw new GraphQLError('Business owners can only create employees in their own business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
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
            logger.error({ err: error, userId: result.user.id }, 'user:createUser driver profile creation failed');
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
        user: result.user as any,
        message: result.message,
    };
};
