// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { userPermissionsRepository } from '@/repositories/UserPermissionsRepository';
import { isPlatformAdmin } from '@/lib/utils/permissions';
import type { Permission } from '@/lib/utils/permissions';
import { GraphQLError } from 'graphql';
import { db } from '../../../../../database';
import { users } from '../../../../../database/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const setUserPermissions: NonNullable<MutationResolvers['setUserPermissions']> = async (
    _parent,
    args,
    context,
) => {
    const { userId, permissions } = args;
    const { role, businessId } = context;
    
    // Only BUSINESS_OWNER can set permissions for their employees
    // Platform admins can set permissions for any business user
    if (!isPlatformAdmin(role) && role !== 'BUSINESS_OWNER') {
        throw new GraphQLError('Only business owners and platform admins can manage permissions', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    
    // Get the target user
    const [targetUser] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt)));
    
    if (!targetUser) {
        throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }
    
    // Only BUSINESS_EMPLOYEE users can have custom permissions assigned
    if (targetUser.role !== 'BUSINESS_EMPLOYEE') {
        throw new GraphQLError('Permissions can only be set for business employees', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }
    
    // Business owners can only set permissions for employees in their own business
    if (role === 'BUSINESS_OWNER') {
        if (targetUser.businessId !== businessId) {
            throw new GraphQLError('You can only manage permissions for employees in your business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    }
    
    // Set the permissions
    await userPermissionsRepository.setUserPermissions(userId, permissions as Permission[]);
    
    // Return the updated user
    return {
        ...targetUser,
        phoneNumber: targetUser.phoneNumber ?? null,
        address: targetUser.address ?? null,
        flagColor: targetUser.flagColor ?? null,
        adminNote: targetUser.adminNote ?? null,
        imageUrl: targetUser.imageUrl ?? null,
        driverLocation: null,
        driverLocationUpdatedAt: null,
        referralCode: targetUser.referralCode ?? null,
    };
};
