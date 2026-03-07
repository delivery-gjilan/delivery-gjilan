// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';

export const deleteDeliveryZone: NonNullable<MutationResolvers['deleteDeliveryZone']> = async (_parent, { id }, _ctx) => {
    const db = await getDB();
    const result = await db
        .delete(deliveryZones)
        .where(eq(deliveryZones.id, id))
        .returning({ id: deliveryZones.id });

    return result.length > 0;
};