import type { QueryResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productVariants as productVariantTable } from '../../../../../database/schema/productVariants';
import { eq } from 'drizzle-orm';

export const productVariant: NonNullable<QueryResolvers['productVariant']> = async (_parent, { id }, _ctx) => {
    const rows = await db
        .select()
        .from(productVariantTable)
        .where(eq(productVariantTable.id, Number(id)));

    const pv = rows[0];
    if (!pv) return null;

    return {
        id: pv.id,
        productId: pv.productId,
        name: pv.name,
        price: Number(pv.price),
        isOnSale: pv.isOnSale ?? false,
        salePrice: pv.salePrice ? Number(pv.salePrice) : null,
        isAvailable: pv.isAvailable ?? true,
        createdAt: pv.createdAt!,
        updatedAt: pv.updatedAt!,
    };
};
