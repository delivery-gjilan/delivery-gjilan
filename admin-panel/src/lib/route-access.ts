export type AdminPanelRole = "SUPER_ADMIN" | "ADMIN" | "BUSINESS_OWNER" | "BUSINESS_EMPLOYEE" | string | null | undefined;

const superAdminOnlyPrefixes = [
    "/dashboard/map",
    "/dashboard/businesses",
    "/dashboard/drivers",
    "/dashboard/promotions",
    "/dashboard/productpricing",
    "/dashboard/delivery-pricing",
    "/dashboard/delivery-zones",
    "/dashboard/admins",
    "/dashboard/users",
    "/dashboard/notifications",
    "/dashboard/realtime",
    "/dashboard/logs",
    "/admin",
];

const businessUserAllowedPrefixes = [
    "/dashboard",
    "/dashboard/orders",
    "/dashboard/market",
    "/dashboard/finances",
    "/dashboard/products",
    "/dashboard/deals",
    "/dashboard/statistics",
    "/dashboard/settings",
];

const businessEmployeeDeniedPrefixes = [
    "/dashboard/finances",
    "/dashboard/settings",
];

function pathStartsWithAny(pathname: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function canAccessAdminPanelPath(role: AdminPanelRole, pathname: string): boolean {
    if (!role) return false;

    if (role === "SUPER_ADMIN") return true;

    if (role === "ADMIN") {
        return !pathStartsWithAny(pathname, superAdminOnlyPrefixes);
    }

    if (role === "BUSINESS_OWNER") {
        return pathStartsWithAny(pathname, businessUserAllowedPrefixes);
    }

    if (role === "BUSINESS_EMPLOYEE") {
        if (!pathStartsWithAny(pathname, businessUserAllowedPrefixes)) {
            return false;
        }

        return !pathStartsWithAny(pathname, businessEmployeeDeniedPrefixes);
    }

    return false;
}
