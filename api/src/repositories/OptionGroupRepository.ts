import { DbType } from '@/database';
import { optionGroups, DbOptionGroup, NewDbOptionGroup } from '@/database/schema/optionGroups';
import { eq, and, inArray, asc } from 'drizzle-orm';

/** NOTE: The option_groups table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

export class OptionGroupRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbOptionGroup): Promise<DbOptionGroup> {
        const [created] = await this.db.insert(optionGroups).values(data).returning();
        return created;
    }

    async findById(id: string): Promise<DbOptionGroup | undefined> {
        return this.db.query.optionGroups.findFirst({
            where: and(eq(optionGroups.id, id), eq(optionGroups.isDeleted, false)),
        });
    }

    async findByProductId(productId: string): Promise<DbOptionGroup[]> {
        return this.db.query.optionGroups.findMany({
            where: and(eq(optionGroups.productId, productId), eq(optionGroups.isDeleted, false)),
            orderBy: [asc(optionGroups.displayOrder)],
        });
    }

    async findByProductIds(productIds: string[]): Promise<DbOptionGroup[]> {
        if (productIds.length === 0) return [];
        return this.db
            .select()
            .from(optionGroups)
            .where(and(inArray(optionGroups.productId, productIds), eq(optionGroups.isDeleted, false)))
            .orderBy(asc(optionGroups.displayOrder));
    }

    async findDistinctProductIdsWithGroups(productIds: string[]): Promise<string[]> {
        if (productIds.length === 0) return [];
        const rows = await this.db
            .selectDistinct({ productId: optionGroups.productId })
            .from(optionGroups)
            .where(and(inArray(optionGroups.productId, productIds), eq(optionGroups.isDeleted, false)));
        return rows.map((r) => r.productId);
    }

    async update(id: string, data: Partial<NewDbOptionGroup>): Promise<DbOptionGroup | undefined> {
        const [updated] = await this.db
            .update(optionGroups)
            .set(data)
            .where(eq(optionGroups.id, id))
            .returning();
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const [result] = await this.db
            .update(optionGroups)
            .set({ isDeleted: true })
            .where(eq(optionGroups.id, id))
            .returning();
        return !!result;
    }
}
