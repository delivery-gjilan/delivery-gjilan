/**
 * Role-based permission checks for the application
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN: Full system access, can manage everything
 * - ADMIN: Platform admin, can help manage system but not as powerful as SUPER_ADMIN
 * - BUSINESS_OWNER: Full control of their business (can manage products, orders, finances)
 * - BUSINESS_EMPLOYEE: Limited access to their business (can view/process orders but not manage settings/finances)
 * - DRIVER: Delivery driver access
 * - CUSTOMER: Customer access
 */

import { db } from '../../../database';
import { userPermissions } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE' | 'DRIVER' | 'CUSTOMER';

export type Permission = 
    | 'view_orders'
    | 'manage_orders'
    | 'view_products'
    | 'manage_products'
    | 'view_finances'
    | 'manage_settings'
    | 'view_analytics';

export interface UserData {
    userId?: string;
    role?: UserRole;
    businessId?: string;
}

/**
 * Platform admin roles that don't require a businessId
 */
export const isPlatformAdmin = (role?: string): boolean => {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
};

/**
 * Business-level roles that require a businessId
 */
export const isBusinessRole = (role?: string): boolean => {
    return role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
};

/**
 * Check if user can create/update/delete users
 */
export const canManageUsers = (userData: UserData): boolean => {
    return userData.role === 'SUPER_ADMIN';
};

/**
 * Check if user can create/update/delete businesses
 */
export const canManageBusinesses = (userData: UserData): boolean => {
    return userData.role === 'SUPER_ADMIN';
};

/**
 * Check if user can create/update/delete promotions
 */
export const canManagePromotions = (userData: UserData): boolean => {
    return userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
};

/**
 * Check if user can view/manage a specific business
 * @param userData - The authenticated user data
 * @param targetBusinessId - The business they're trying to access
 */
export const canAccessBusiness = (userData: UserData, targetBusinessId?: string): boolean => {
    // Platform admins can access any business
    if (isPlatformAdmin(userData.role)) {
        return true;
    }
    
    // Business roles can only access their own business
    if (isBusinessRole(userData.role) && userData.businessId === targetBusinessId) {
        return true;
    }
    
    return false;
};

/**
 * Check if user can modify business settings (hours, commission, etc)
 */
export const canModifyBusinessSettings = (userData: UserData, targetBusinessId?: string): boolean => {
    // Platform admins can modify any business
    if (isPlatformAdmin(userData.role)) {
        return true;
    }
    
    // Only business owners can modify their own business settings (not employees)
    if (userData.role === 'BUSINESS_OWNER' && userData.businessId === targetBusinessId) {
        return true;
    }
    
    return false;
};

/**
 * Check if user can view/manage products for a business
 */
export const canManageProducts = (userData: UserData, targetBusinessId?: string): boolean => {
    // Platform admins can manage products for any business
    if (isPlatformAdmin(userData.role)) {
        return true;
    }
    
    // Business owner can manage their products
    if (userData.role === 'BUSINESS_OWNER' && userData.businessId === targetBusinessId) {
        return true;
    }
    
    // Business employee can also manage products (availability, pricing, details)
    if (userData.role === 'BUSINESS_EMPLOYEE' && userData.businessId === targetBusinessId) {
        return true;
    }
    
    return false;
};

/**
 * Check if user can view/manage orders
 */
export const canManageOrders = (userData: UserData, targetBusinessId?: string): boolean => {
    // Platform admins can manage all orders
    if (isPlatformAdmin(userData.role)) {
        return true;
    }
    
    // Business users can manage orders for their business
    if (isBusinessRole(userData.role) && userData.businessId === targetBusinessId) {
        return true;
    }
    
    return false;
};

/**
 * Check if user can view financial data (settlements, commission)
 */
export const canViewFinances = (userData: UserData, targetBusinessId?: string): boolean => {
    // Platform admins can view all finances
    if (isPlatformAdmin(userData.role)) {
        return true;
    }
    
    // Only business owners can view their business finances (not employees)
    if (userData.role === 'BUSINESS_OWNER' && userData.businessId === targetBusinessId) {
        return true;
    }
    
    // Drivers can view their own settlements
    if (userData.role === 'DRIVER') {
        return true;
    }
    
    return false;
};

/**
 * Check if user can view user notes and behavior data
 */
export const canViewUserData = (userData: UserData): boolean => {
    return isPlatformAdmin(userData.role) || isBusinessRole(userData.role);
};

/**
 * Check if user can view audit logs
 */
export const canViewAuditLogs = (userData: UserData): boolean => {
    return userData.role === 'SUPER_ADMIN';
};

/**
 * Check if user can manage drivers (assign, update location, etc)
 */
export const canManageDrivers = (userData: UserData): boolean => {
    return isPlatformAdmin(userData.role);
};

/**
 * Validate that business roles have a businessId
 */
export const validateBusinessRole = (role: UserRole, businessId?: string): void => {
    if (isBusinessRole(role) && !businessId) {
        throw new Error(`Business ID is required for ${role} role`);
    }
};

/**
 * ========================================
 * GRANULAR PERMISSION SYSTEM
 * ========================================
 * For BUSINESS_EMPLOYEE users, permissions are stored in user_permissions table.
 * BUSINESS_OWNER and platform admins have all permissions by default.
 */

/**
 * Get all permissions granted to a user from the database
 * Platform admins and business owners automatically have all permissions
 */
export const getUserPermissions = async (userData: UserData): Promise<Permission[]> => {
    // Platform admins have all permissions
    if (isPlatformAdmin(userData.role)) {
        return [
            'view_orders',
            'manage_orders',
            'view_products',
            'manage_products',
            'view_finances',
            'manage_settings',
            'view_analytics'
        ];
    }
    
    // Business owners have all permissions for their business
    if (userData.role === 'BUSINESS_OWNER') {
        return [
            'view_orders',
            'manage_orders',
            'view_products',
            'manage_products',
            'view_finances',
            'manage_settings',
            'view_analytics'
        ];
    }
    
    // Business employees: fetch their specific permissions from database
    if (userData.role === 'BUSINESS_EMPLOYEE' && userData.userId) {
        const permissions = await db
            .select()
            .from(userPermissions)
            .where(eq(userPermissions.userId, userData.userId));
        
        return permissions.map((p: any) => p.permission as Permission);
    }
    
    // Other roles (DRIVER, CUSTOMER) have no business permissions
    return [];
};

/**
 * Check if user has a specific permission
 * @param userData - The authenticated user data
 * @param permission - The permission to check
 * @returns Promise<boolean> - True if user has the permission
 */
export const hasPermission = async (userData: UserData, permission: Permission): Promise<boolean> => {
    const permissions = await getUserPermissions(userData);
    return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param userData - The authenticated user data
 * @param requiredPermissions - Array of permissions (user needs at least one)
 * @returns Promise<boolean> - True if user has any of the permissions
 */
export const hasAnyPermission = async (userData: UserData, requiredPermissions: Permission[]): Promise<boolean> => {
    const permissions = await getUserPermissions(userData);
    return requiredPermissions.some(p => permissions.includes(p));
};

/**
 * Check if user has all of the specified permissions
 * @param userData - The authenticated user data
 * @param requiredPermissions - Array of permissions (user needs all)
 * @returns Promise<boolean> - True if user has all permissions
 */
export const hasAllPermissions = async (userData: UserData, requiredPermissions: Permission[]): Promise<boolean> => {
    const permissions = await getUserPermissions(userData);
    return requiredPermissions.every(p => permissions.includes(p));
};

/**
 * Get default permissions for a role (used when creating new users)
 */
export const getDefaultPermissions = (role: UserRole): Permission[] => {
    if (isPlatformAdmin(role) || role === 'BUSINESS_OWNER') {
        return [
            'view_orders',
            'manage_orders',
            'view_products',
            'manage_products',
            'view_finances',
            'manage_settings',
            'view_analytics'
        ];
    }
    
    // Business employees get no permissions by default - owner must assign them
    if (role === 'BUSINESS_EMPLOYEE') {
        return [];
    }
    
    // Drivers and customers get no business permissions
    return [];
};
