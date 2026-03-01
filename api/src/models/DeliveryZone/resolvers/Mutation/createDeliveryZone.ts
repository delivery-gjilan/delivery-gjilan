import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { AppError } from '@/lib/errors';

export const createDeliveryZone: NonNullable<MutationResolvers['createDeliveryZone']> = async (_parent, { input }, _ctx) => {
    if (!input.polygon || input.polygon.length < 3) {
        throw AppError.badInput('A polygon must have at least 3 points');
    }

    const db = await getDB();
    const [row] = await db
        .insert(deliveryZones)
        .values({
            name: input.name,
            polygon: input.polygon,
            deliveryFee: input.deliveryFee,
            sortOrder: input.sortOrder ?? 0,
            isActive: input.isActive ?? true,
        })
        .returning();

    return {
        id: row.id,
        name: row.name,
        polygon: row.polygon,
        deliveryFee: row.deliveryFee,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
};