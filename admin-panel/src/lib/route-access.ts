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
    "/dashboard/simulation",
    "/admin",
];

const businessUserAllowedPrefixes = [
    "/dashboard/orders",
    "/dashboard/business-settlements",
    "/dashboard/categories",
    "/dashboard/products",
    "/dashboard/statistics",
    "/dashboard/settings",
];

const businessEmployeeDeniedPrefixes = [
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
        return pathname === "/dashboard" || pathStartsWithAny(pathname, businessUserAllowedPrefixes);
    }

    if (role === "BUSINESS_EMPLOYEE") {
        if (!(pathname === "/dashboard" || pathStartsWithAny(pathname, businessUserAllowedPrefixes))) {
            return false;
        }

        return !pathStartsWithAny(pathname, businessEmployeeDeniedPrefixes);
    }

    return false;
}
