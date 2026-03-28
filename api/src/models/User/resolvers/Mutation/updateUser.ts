import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { canManageUsers } from '@/lib/utils/permissions';
import { toUserParent } from '../utils/toUserParent';

export const updateUser: NonNullable<MutationResolvers['updateUser']> = async (_parent, { input }, { authService, userData }) => {
    const { id, firstName, lastName, role, businessId } = input;

    // SUPER_ADMIN can update any user.
    // BUSINESS_OWNER can only update BUSINESS_EMPLOYEE users in their own business.
    if (!canManageUsers(userData)) {
        if (userData.role !== 'BUSINESS_OWNER') {
            throw new GraphQLError('Unauthorized: Only super admins and business owners can update users', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (!userData.businessId) {
            throw new GraphQLError('Business owner must be associated with a business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        const targetUser = await authService.getUserById(id);
        if (!targetUser) {
            throw new GraphQLError('User not found', {
                extensions: { code: 'NOT_FOUND' },
            });
        }

        if (targetUser.role !== 'BUSINESS_EMPLOYEE' || targetUser.businessId !== userData.businessId) {
            throw new GraphQLError('Business owners can only update employees in their own business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (role !== 'BUSINESS_EMPLOYEE') {
            throw new GraphQLError('Business owners cannot change employee role type', {
                extensions: { code: 'FORBIDDEN' },
            });
        }

        if (businessId && businessId !== userData.businessId) {
            throw new GraphQLError('Business owners cannot reassign employees to another business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }

    // Update the user
    const updatedUser = await authService.authRepository.updateUser(id, {
        firstName,
        lastName,
        role,
        businessId: userData.role === 'BUSINESS_OWNER' ? userData.businessId || null : businessId || null,
    });

    if (!updatedUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    return toUserParent(updatedUser);
};