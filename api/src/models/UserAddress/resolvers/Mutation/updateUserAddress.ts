import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userAddress } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const updateUserAddress: NonNullable<MutationResolvers['updateUserAddress']> = async (_parent, { input }, { userData }) => {
    if (!userData.userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();
    
    const updateData: any = {};
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.addressName !== undefined) updateData.addressName = input.addressName;
    if (input.displayName !== undefined) updateData.displayName = input.displayName;
    if (input.priority !== undefined) updateData.priority = input.priority;

    const [updated] = await db
        .update(userAddress)
        .set(updateData)
        .where(
            and(
                eq(userAddress.id, input.id),
                eq(userAddress.userId, userData.userId)
            )
        )
        .returning();

    if (!updated) {
        throw AppError.notFound('Address');
    }

    return {
        id: updated.id,
        userId: updated.userId!,
        latitude: updated.latitude,
        longitude: updated.longitude,
        addressName: updated.addressName,
        displayName: updated.displayName,
        priority: updated.priority,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
    };
};