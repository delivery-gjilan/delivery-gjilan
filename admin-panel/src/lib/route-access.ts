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
    "/dashboard/ops-wall",
    "/dashboard/logs",
    "/admin",
];

const businessUserAllowedPrefixes = [
    "/dashboard/orders",
    "/dashboard/categories",
    "/dashboard/products",
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

    if (role === "BUSINESS_OWNER" || role === "BUSINESS_EMPLOYEE") {
        return pathname === "/dashboard" || pathStartsWithAny(pathname, businessUserAllowedPrefixes);
    }

    return false;
}
