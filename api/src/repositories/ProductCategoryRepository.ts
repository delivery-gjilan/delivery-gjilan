import { DbType } from '@/database';
import { DbProductCategory, NewDbProductCategory, productCategories } from '@/database/schema/productCategories';
import { and, asc, eq } from 'drizzle-orm';

export class ProductCategoryRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbProductCategory): Promise<DbProductCategory> {
        const [createdCategory] = await this.db.insert(productCategories).values(data).returning();
        return createdCategory;
    }

    async findById(id: string): Promise<DbProductCategory | undefined> {
        const [category] = await this.db.select().from(productCategories).where(eq(productCategories.id, id));
        return category;
    }

    async findByBusinessId(businessId: string): Promise<DbProductCategory[]> {
        return this.db
            .select()
            .from(productCategories)
            .where(eq(productCategories.businessId, businessId))
            .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
    }

    async update(id: string, data: Partial<NewDbProductCategory>): Promise<DbProductCategory | undefined> {
        const [updatedCategory] = await this.db
            .update(productCategories)
            .set(data)
            .where(eq(productCategories.id, id))
            .returning();
        return updatedCategory;
    }

    async delete(id: string): Promise<boolean> {
        const [deletedCategory] = await this.db
            .delete(productCategories)
            .where(eq(productCategories.id, id))
            .returning();
        return !!deletedCategory;
    }

    async updateCategoriesOrder(businessId: string, categoriesOrder: { id: string; sortOrder: number }[]): Promise<void> {
        await this.db.transaction(async (tx) => {
            for (const categoryOrder of categoriesOrder) {
                await tx
                    .update(productCategories)
                    .set({ sortOrder: categoryOrder.sortOrder })
                    .where(and(eq(productCategories.id, categoryOrder.id), eq(productCategories.businessId, businessId)));
            }
        });
    }
}
