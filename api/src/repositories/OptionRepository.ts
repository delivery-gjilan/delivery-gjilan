import { DbType } from '@/database';
import { options, DbOption, NewDbOption } from '@/database/schema/options';
import { eq, and, inArray, asc } from 'drizzle-orm';

/** NOTE: The options table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

export class OptionRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbOption): Promise<DbOption> {
        const [created] = await this.db.insert(options).values(data).returning();
        return created;
    }

    async createMany(data: NewDbOption[]): Promise<DbOption[]> {
        if (data.length === 0) return [];
        return this.db.insert(options).values(data).returning();
    }

    async findById(id: string): Promise<DbOption | undefined> {
        return this.db.query.options.findFirst({
            where: and(eq(options.id, id), eq(options.isDeleted, false)),
        });
    }

    async findByIds(ids: string[]): Promise<DbOption[]> {
        if (ids.length === 0) return [];
        return this.db
            .select()
            .from(options)
            .where(and(inArray(options.id, ids), eq(options.isDeleted, false)))
            .orderBy(asc(options.displayOrder));
    }

    async findByOptionGroupId(optionGroupId: string): Promise<DbOption[]> {
        return this.db.query.options.findMany({
            where: and(eq(options.optionGroupId, optionGroupId), eq(options.isDeleted, false)),
            orderBy: [asc(options.displayOrder)],
        });
    }

    async findByOptionGroupIds(groupIds: string[]): Promise<DbOption[]> {
        if (groupIds.length === 0) return [];
        return this.db
            .select()
            .from(options)
            .where(and(inArray(options.optionGroupId, groupIds), eq(options.isDeleted, false)))
            .orderBy(asc(options.displayOrder));
    }

    async update(id: string, data: Partial<NewDbOption>): Promise<DbOption | undefined> {
        const [updated] = await this.db
            .update(options)
            .set(data)
            .where(eq(options.id, id))
            .returning();
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const [result] = await this.db
            .update(options)
            .set({ isDeleted: true })
            .where(eq(options.id, id))
            .returning();
        return !!result;
    }
}
