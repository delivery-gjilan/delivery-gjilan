import { DbType } from '@/database';
import { DbProductSubcategory, NewDbProductSubcategory, productSubcategories } from '@/database/schema/productSubcategories';
import { eq, inArray } from 'drizzle-orm';

export class ProductSubcategoryRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbProductSubcategory): Promise<DbProductSubcategory> {
        const [created] = await this.db.insert(productSubcategories).values(data).returning();
        return created;
    }

    async findById(id: string): Promise<DbProductSubcategory | undefined> {
        const [subcategory] = await this.db.select().from(productSubcategories).where(eq(productSubcategories.id, id));
        return subcategory;
    }

    async findByCategoryId(categoryId: string): Promise<DbProductSubcategory[]> {
        return this.db.select().from(productSubcategories).where(eq(productSubcategories.categoryId, categoryId));
    }

    async findByCategoryIds(categoryIds: string[]): Promise<DbProductSubcategory[]> {
        if (categoryIds.length === 0) return [];
        return this.db.select().from(productSubcategories).where(inArray(productSubcategories.categoryId, categoryIds));
    }

    async update(id: string, data: Partial<NewDbProductSubcategory>): Promise<DbProductSubcategory | undefined> {
        const [updated] = await this.db
            .update(productSubcategories)
            .set(data)
            .where(eq(productSubcategories.id, id))
            .returning();
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const [deleted] = await this.db
            .delete(productSubcategories)
            .where(eq(productSubcategories.id, id))
            .returning();
        return !!deleted;
    }
}