import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { deliveryZones as deliveryZonesTable } from '@/database/schema/deliveryZones';
import { asc } from 'drizzle-orm';

export const deliveryZones: NonNullable<QueryResolvers['deliveryZones']> = async (_parent, _arg, _ctx) => {
    const db = await getDB();
    const rows = await db
        .select()
        .from(deliveryZonesTable)
        .orderBy(asc(deliveryZonesTable.sortOrder), asc(deliveryZonesTable.createdAt));

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