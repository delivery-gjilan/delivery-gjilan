// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { userAddress } from '@/database/schema';
import { AppError } from '@/lib/errors';

export const addUserAddress: NonNullable<MutationResolvers['addUserAddress']> = async (_parent, { input }, { userData }) => {
    if (!userData.userId) {
        throw AppError.unauthorized();
    }

    const db = await getDB();
    const [newAddress] = await db
        .insert(userAddress)
        .values({
            userId: userData.userId,
            latitude: input.latitude,
            longitude: input.longitude,
            addressName: input.addressName || null,
            displayName: input.displayName || null,
            priority: input.priority ?? 0,
        })
        .returning();

    return {
        id: newAddress.id,
        userId: newAddress.userId!,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        addressName: newAddress.addressName,
        displayName: newAddress.displayName,
        priority: newAddress.priority,
        createdAt: newAddress.createdAt,
        updatedAt: newAddress.updatedAt,
    };
};