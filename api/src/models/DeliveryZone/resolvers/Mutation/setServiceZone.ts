import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';

export const setServiceZone: any = async (_parent, { id }, _ctx): Promise<any> => {
    const db = await getDB();

    if (id) {
        await db.update(deliveryZones).set({ isServiceZone: true }).where(eq(deliveryZones.id, id));
    } else {
        // Preserve existing API ability to clear all service-zone flags when id is omitted.
        await db.update(deliveryZones).set({ isServiceZone: false });
    }

    return true;
};