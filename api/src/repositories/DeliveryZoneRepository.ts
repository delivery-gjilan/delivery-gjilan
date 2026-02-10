import { DbType } from '@/database';
import { DbDeliveryZone, NewDbDeliveryZone, deliveryZones } from '@/database/schema/deliveryZones';
import { eq } from 'drizzle-orm';

export class DeliveryZoneRepository {
    constructor(private db: DbType) {}

    async create(zone: NewDbDeliveryZone): Promise<DbDeliveryZone> {
        const [created] = await this.db.insert(deliveryZones).values(zone).returning();
        return created;
    }

    async findById(id: string): Promise<DbDeliveryZone | undefined> {
        const [zone] = await this.db.select().from(deliveryZones).where(eq(deliveryZones.id, id));
        return zone;
    }

    async findAll(): Promise<DbDeliveryZone[]> {
        return this.db.select().from(deliveryZones);
    }

    async update(id: string, updates: Partial<NewDbDeliveryZone>): Promise<DbDeliveryZone | undefined> {
        const [updated] = await this.db.update(deliveryZones).set(updates).where(eq(deliveryZones.id, id)).returning();
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(deliveryZones).where(eq(deliveryZones.id, id)).returning();
        return result.length > 0;
    }

    async findActiveZones(): Promise<DbDeliveryZone[]> {
        return this.db.select().from(deliveryZones).where(eq(deliveryZones.isActive, 'true'));
    }
}
