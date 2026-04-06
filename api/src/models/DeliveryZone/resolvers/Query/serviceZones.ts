import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones as deliveryZonesTable } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';

export const serviceZones: any = async (_parent, _arg, _ctx): Promise<any> => {
    const db = await getDB();
    const rows = await db
        .select()
        .from(deliveryZonesTable)
        .where(eq(deliveryZonesTable.isServiceZone, true));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        polygon: row.polygon,
        deliveryFee: row.deliveryFee,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isServiceZone: row.isServiceZone,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }));
};