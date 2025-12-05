import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { products as productTable } from '../../../../../database/schema/products';
import { eq, and } from 'drizzle-orm';

export const products: NonNullable<QueryResolvers['products']> = async (_parent, { businessId, categoryId }) => {
    let rows;

    const conditions = [];
    if (businessId) {
        conditions.push(eq(productTable.businessId, Number(businessId)));
    }
    if (categoryId) {
        conditions.push(eq(productTable.categoryId, Number(categoryId)));
    }

    if (conditions.length > 0) {
        rows = await db
            .select()
            .from(productTable)
            .where(and(...conditions));
    } else {
        rows = await db.select().from(productTable);
    }

    return rows.map((p) => ({
        id: p.id,
        businessId: p.businessId,
        categoryId: p.categoryId,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        price: Number(p.price),
        isOnSale: p.isOnSale ?? false,
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        isAvailable: p.isAvailable ?? true,
        createdAt: p.createdAt!,
        updatedAt: p.updatedAt!,
    }));
};
