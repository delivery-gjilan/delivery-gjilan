import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userAddress } from '@/database/schema';
import { eq, and } from 'drizzle-orm';

export const deleteUserAddress: NonNullable<MutationResolvers['deleteUserAddress']> = async (_parent, { id }, { userData }) => {
    if (!userData.userId) {
        throw new Error('Unauthorized');
    }

    const db = await getDB();
    const result = await db
        .delete(userAddress)
        .where(
            and(
                eq(userAddress.id, id),
                eq(userAddress.userId, userData.userId)
            )
        )
        .returning();

    return result.length > 0;
};