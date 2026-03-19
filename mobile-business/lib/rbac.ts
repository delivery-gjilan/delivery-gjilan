import { UserPermission } from '@/gql/graphql';

type BusinessUserLike = {
    role?: string | null;
    permissions?: UserPermission[] | null;
};

export function isBusinessOwner(user: BusinessUserLike | null | undefined): boolean {
    return user?.role === 'BUSINESS_OWNER';
}

export function hasBusinessPermission(
    user: BusinessUserLike | null | undefined,
    permission: UserPermission,
): boolean {
    if (!user) {
        return false;
    }

    if (isBusinessOwner(user)) {
        return true;
    }

    return Array.isArray(user.permissions) && user.permissions.includes(permission);
}
