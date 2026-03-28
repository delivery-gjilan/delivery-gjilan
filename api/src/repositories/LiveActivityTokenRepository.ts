import { db } from '@/database';
import {
    liveActivityTokens,
    type DbLiveActivityToken,
    type NewDbLiveActivityToken,
} from '@/database/schema/liveActivityTokens';
import { eq, and } from 'drizzle-orm';

export class LiveActivityTokenRepository {
    /**
     * Register a new Live Activity token for an order
     */
    async upsertToken(data: Omit<NewDbLiveActivityToken, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbLiveActivityToken> {
        const [token] = await db
            .insert(liveActivityTokens)
            .values(data)
            .onConflictDoUpdate({
                target: liveActivityTokens.activityId,
                set: {
                    pushToken: data.pushToken,
                    updatedAt: new Date().toISOString(),
                },
            })
            .returning();

        if (!token) {
            throw new Error('Failed to upsert Live Activity token');
        }

        return token;
    }

    /**
     * Get all Live Activity tokens for a specific order
     */
    async getTokensByOrderId(orderId: string): Promise<DbLiveActivityToken[]> {
        return db.select().from(liveActivityTokens).where(eq(liveActivityTokens.orderId, orderId));
    }

    /**
     * Get Live Activity token by activity ID
     */
    async getTokenByActivityId(activityId: string): Promise<DbLiveActivityToken | null> {
        const [token] = await db
            .select()
            .from(liveActivityTokens)
            .where(eq(liveActivityTokens.activityId, activityId));

        return token || null;
    }

    /**
     * Remove a Live Activity token (when activity ends)
     */
    async removeToken(activityId: string): Promise<void> {
        await db.delete(liveActivityTokens).where(eq(liveActivityTokens.activityId, activityId));
    }

    /**
     * Remove all Live Activity tokens for an order (when order completes)
     */
    async removeTokensByOrderId(orderId: string): Promise<void> {
        await db.delete(liveActivityTokens).where(eq(liveActivityTokens.orderId, orderId));
    }

    /**
     * Remove all Live Activity tokens for a user
     */
    async removeTokensByUserId(userId: string): Promise<void> {
        await db.delete(liveActivityTokens).where(eq(liveActivityTokens.userId, userId));
    }
}
