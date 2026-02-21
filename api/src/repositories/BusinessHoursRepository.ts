import { DbType } from '@/database';
import { businessHours } from '@/database/schema/businessHours';
import { eq, and } from 'drizzle-orm';

export type DbBusinessHours = typeof businessHours.$inferSelect;
export type NewDbBusinessHours = typeof businessHours.$inferInsert;

export class BusinessHoursRepository {
    constructor(private db: DbType) {}

    async findByBusinessId(businessId: string): Promise<DbBusinessHours[]> {
        return this.db
            .select()
            .from(businessHours)
            .where(eq(businessHours.businessId, businessId))
            .orderBy(businessHours.dayOfWeek, businessHours.opensAt);
    }

    async findByBusinessIds(businessIds: string[]): Promise<DbBusinessHours[]> {
        if (businessIds.length === 0) return [];
        const { inArray } = await import('drizzle-orm');
        return this.db
            .select()
            .from(businessHours)
            .where(inArray(businessHours.businessId, businessIds))
            .orderBy(businessHours.dayOfWeek, businessHours.opensAt);
    }

    /**
     * Replace the entire schedule for a business (delete + insert).
     * Runs in a transaction.
     */
    async replaceSchedule(
        businessId: string,
        slots: Array<Omit<NewDbBusinessHours, 'id' | 'businessId' | 'createdAt'>>,
    ): Promise<DbBusinessHours[]> {
        return this.db.transaction(async (tx) => {
            // Delete existing schedule
            await tx.delete(businessHours).where(eq(businessHours.businessId, businessId));

            if (slots.length === 0) return [];

            // Insert new slots
            const rows = slots.map((s) => ({
                businessId,
                dayOfWeek: s.dayOfWeek,
                opensAt: s.opensAt,
                closesAt: s.closesAt,
            }));

            return tx.insert(businessHours).values(rows).returning();
        });
    }

    async deleteByBusinessId(businessId: string): Promise<void> {
        await this.db.delete(businessHours).where(eq(businessHours.businessId, businessId));
    }
}
