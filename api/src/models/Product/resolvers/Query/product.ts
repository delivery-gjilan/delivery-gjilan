import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { products as productTable } from '../../../../../database/schema/products';
import { eq } from 'drizzle-orm';

export const product: NonNullable<QueryResolvers['product']> = async (_parent, { id }, _ctx) => {
    const rows = await db
        .select()
        .from(productTable)
        .where(eq(productTable.id, Number(id)));

    const p = rows[0];
    if (!p) return null;

    return {
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
    };
};
