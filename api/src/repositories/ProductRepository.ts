import { DbType } from '@/database';
import { DbProduct, NewDbProduct, products } from '@/database/schema/products';
import { eq, and, inArray, asc } from 'drizzle-orm';

export class ProductRepository {
    constructor(private db: DbType) {}

    async create(data: NewDbProduct): Promise<DbProduct> {
        const [createdProduct] = await this.db.insert(products).values(data).returning();
        return createdProduct;
    }

    async findById(id: string): Promise<DbProduct | undefined> {
        const [product] = await this.db.select().from(products).where(eq(products.id, id));
        return product;
    }

    async findByBusinessId(businessId: string): Promise<DbProduct[]> {
        return this.db
            .select()
            .from(products)
            .where(eq(products.businessId, businessId))
            .orderBy(asc(products.categoryId), asc(products.subcategoryId), asc(products.sortOrder));
    }

    async update(id: string, data: Partial<NewDbProduct>): Promise<DbProduct | undefined> {
        const [updatedProduct] = await this.db.update(products).set(data).where(eq(products.id, id)).returning();
        return updatedProduct;
    }

    async delete(id: string): Promise<boolean> {
        const [deletedProduct] = await this.db.delete(products).where(eq(products.id, id)).returning();
        return !!deletedProduct;
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
