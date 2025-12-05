import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productVariants as productVariantTable } from '../../../../../database/schema/productVariants';
import { eq } from 'drizzle-orm';

export const productVariants: NonNullable<QueryResolvers['productVariants']> = async (_parent, { productId }) => {
    let rows;

    if (productId) {
        rows = await db
            .select()
            .from(productVariantTable)
            .where(eq(productVariantTable.productId, Number(productId)));
    } else {
        rows = await db.select().from(productVariantTable);
    }

    return rows.map((pv) => ({
        id: pv.id,
        productId: pv.productId,
        name: pv.name,
        price: Number(pv.price),
        isOnSale: pv.isOnSale ?? false,
        salePrice: pv.salePrice ? Number(pv.salePrice) : null,
        isAvailable: pv.isAvailable ?? true,
        createdAt: pv.createdAt!,
        updatedAt: pv.updatedAt!,
    }));
};
