import { db } from '../../database';
import { userPermissions } from '../../database/schema';
import { eq } from 'drizzle-orm';
import type { Permission } from '../lib/utils/permissions';

export class UserPermissionsRepository {
    /**
     * Get all permissions for a user
     */
    async getUserPermissions(userId: string): Promise<Permission[]> {
        const permissions = await db
            .select()
            .from(userPermissions)
            .where(eq(userPermissions.userId, userId));
        
        return permissions.map((p: any) => p.permission as Permission);
    }

    /**
     * Set permissions for a user (replaces all existing permissions)
     */
    async setUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
        // Delete existing permissions
        await db
            .delete(userPermissions)
            .where(eq(userPermissions.userId, userId));
        
        // Insert new permissions
        if (permissions.length > 0) {
            await db.insert(userPermissions).values(
                permissions.map(permission => ({
                    userId,
                    permission
                }))
            );
        }
    }

    /**
     * Add a single permission to a user
     */
    async addPermission(userId: string, permission: Permission): Promise<void> {
        // Check if permission already exists
        const existing = await db
            .select()
            .from(userPermissions)
            .where(eq(userPermissions.userId, userId));
        
        const hasPermission = existing.some((p: any) => p.permission === permission);
        
        if (!hasPermission) {
            await db.insert(userPermissions).values({
                userId,
                permission
            });
        }
    }

    /**
     * Remove a single permission from a user
     */
    async removePermission(userId: string, permission: Permission): Promise<void> {
        await db
            .delete(userPermissions)
            .where(eq(userPermissions.userId, userId));
    }

    /**
     * Delete all permissions for a user (used when deleting user)
     */
    async deleteUserPermissions(userId: string): Promise<void> {
        await db
            .delete(userPermissions)
            .where(eq(userPermissions.userId, userId));
    }
}

export const userPermissionsRepository = new UserPermissionsRepository();
