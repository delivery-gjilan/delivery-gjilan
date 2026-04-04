import { DbType } from '@/database';
import { DbProduct, NewDbProduct, products } from '@/database/schema/products';
import { eq, and, inArray, asc } from 'drizzle-orm';

/** NOTE: The products table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

export class ProductRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbProduct): Promise<DbProduct> {
        const [createdProduct] = await this.db.insert(products).values(data).returning();
        return createdProduct;
    }

    async findById(id: string): Promise<DbProduct | undefined> {
        return this.db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.isDeleted, false)),
        });
    }

    async findByIds(ids: string[]): Promise<DbProduct[]> {
        if (ids.length === 0) return [];
        return this.db.query.products.findMany({
            where: and(inArray(products.id, ids), eq(products.isDeleted, false)),
        });
    }

    async findByBusinessId(businessId: string): Promise<DbProduct[]> {
        return this.db.query.products.findMany({
            where: and(eq(products.businessId, businessId), eq(products.isDeleted, false)),
            orderBy: (products, { asc }) => [
                asc(products.categoryId),
                asc(products.subcategoryId),
                asc(products.sortOrder),
            ],
        });
    }

    async update(id: string, data: Partial<NewDbProduct>): Promise<DbProduct | undefined> {
        const [updatedProduct] = await this.db.update(products).set(data).where(eq(products.id, id)).returning();
        return updatedProduct;
    }

    async delete(id: string): Promise<boolean> {
        // Soft-delete: mark as deleted instead of removing
        const [result] = await this.db.update(products).set({ isDeleted: true, isAvailable: false }).where(eq(products.id, id)).returning();
        return !!result;
    }

    async updateProductsOrder(businessId: string, productsOrder: { id: string; sortOrder: number }[]): Promise<void> {
        // Use a transaction to update all products at once
        await this.db.transaction(async (tx) => {
            for (const productOrder of productsOrder) {
                await tx
                    .update(products)
                    .set({ sortOrder: productOrder.sortOrder })
                    .where(and(eq(products.id, productOrder.id), eq(products.businessId, businessId)));
            }
        });
    }
}
