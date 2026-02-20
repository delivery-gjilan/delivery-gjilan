import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userAddress } from '@/database/schema';
import { eq, and, ne } from 'drizzle-orm';

export const setDefaultAddress: NonNullable<MutationResolvers['setDefaultAddress']> = async (_parent, { id }, { userData }) => {
    if (!userData.userId) {
        throw new Error('Unauthorized');
    }

    const db = await getDB();
    
    // First, set all other addresses to priority 0
    await db
        .update(userAddress)
        .set({ priority: 0 })
        .where(
            and(
                eq(userAddress.userId, userData.userId),
                ne(userAddress.id, id)
            )
        );

    // Then set the selected address to priority 1 (default)
    const [updated] = await db
        .update(userAddress)
        .set({ priority: 1 })
        .where(
            and(
                eq(userAddress.id, id),
                eq(userAddress.userId, userData.userId)
            )
        )
        .returning();

    return !!updated;
};