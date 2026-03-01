import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userAddress } from '@/database/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const myAddresses: NonNullable<QueryResolvers['myAddresses']> = async (_parent, _arg, { userData }) => {
    if (!userData.userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();
    const addresses = await db
        .select()
        .from(userAddress)
        .where(eq(userAddress.userId, userData.userId))
        .orderBy(desc(userAddress.priority));

    return addresses.map(addr => ({
        id: addr.id,
        userId: addr.userId!,
        latitude: addr.latitude,
        longitude: addr.longitude,
        addressName: addr.addressName,
        displayName: addr.displayName,
        priority: addr.priority,
        createdAt: addr.createdAt,
        updatedAt: addr.updatedAt,
    }));
};