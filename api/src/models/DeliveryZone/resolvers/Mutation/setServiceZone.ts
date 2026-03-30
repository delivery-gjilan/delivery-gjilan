import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { eq, ne } from 'drizzle-orm';

export const setServiceZone: NonNullable<MutationResolvers['setServiceZone']> = async (_parent, { id }, _ctx) => {
    const db = await getDB();

    // Clear the flag on all zones first
    await db.update(deliveryZones).set({ isServiceZone: false });

    // If an id was provided, set that zone as the service zone
    if (id) {
        await db.update(deliveryZones).set({ isServiceZone: true }).where(eq(deliveryZones.id, id));
    }

    return true;
};