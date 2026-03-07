// @ts-nocheck
import type { UserResolvers } from './../../../generated/types.generated';
import { getUserPermissions } from '@/lib/utils/permissions';

export const permissions: NonNullable<UserResolvers['permissions']> = async (
    parent,
    _args,
    _context,
) => {
    // Get permissions for this user
    const perms = await getUserPermissions({
        userId: parent.id,
        role: parent.role as any,
        businessId: parent.businessId ?? undefined,
    });
    
    return perms as any;
};
