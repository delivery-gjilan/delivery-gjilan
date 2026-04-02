import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const updateDeliveryZone: NonNullable<MutationResolvers['updateDeliveryZone']> = async (_parent, { id, input }, _ctx) => {
    if (input.polygon && input.polygon.length < 3) {
        throw AppError.badInput('A polygon must have at least 3 points');
    }

    const db = await getDB();

    const updates: Record<string, unknown> = {};
    if (input.name != null) updates.name = input.name;
    if (input.polygon != null) updates.polygon = input.polygon;
    if (input.deliveryFee != null) updates.deliveryFee = input.deliveryFee;
    if (input.sortOrder != null) updates.sortOrder = input.sortOrder;
    if (input.isActive != null) updates.isActive = input.isActive;
    if (input.isServiceZone != null) updates.isServiceZone = input.isServiceZone;

    const [row] = await db
        .update(deliveryZones)
        .set(updates)
        .where(eq(deliveryZones.id, id))
        .returning();

    if (!row) {
        throw AppError.notFound(`Delivery zone with ID ${id}`);
    }

    return {
        id: row.id,
        name: row.name,
        polygon: row.polygon,
        deliveryFee: row.deliveryFee,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isServiceZone: row.isServiceZone,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
};