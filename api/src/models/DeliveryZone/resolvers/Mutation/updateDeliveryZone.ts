import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const updateDeliveryZone: NonNullable<MutationResolvers['updateDeliveryZone']> = async (_parent, { id, input }, _ctx) => {
    if (input.polygon && input.polygon.length < 3) {
        throw new GraphQLError('A polygon must have at least 3 points');
    }

    const db = await getDB();

    const updates: Record<string, unknown> = {};
    if (input.name != null) updates.name = input.name;
    if (input.polygon != null) updates.polygon = input.polygon;
    if (input.deliveryFee != null) updates.deliveryFee = input.deliveryFee;
    if (input.sortOrder != null) updates.sortOrder = input.sortOrder;
    if (input.isActive != null) updates.isActive = input.isActive;

    const [row] = await db
        .update(deliveryZones)
        .set(updates)
        .where(eq(deliveryZones.id, id))
        .returning();

    if (!row) {
        throw new GraphQLError(`Delivery zone with ID ${id} not found`);
    }

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