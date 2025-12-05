import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productVariants as productVariantTable } from '../../../../../database/schema/productVariants';

export const createProductVariant: NonNullable<MutationResolvers['createProductVariant']> = async (
    _parent,
    { input },
    _ctx,
) => {
    const [created] = await db
        .insert(productVariantTable)
        .values({
            productId: Number(input.productId),
            name: input.name,
            price: String(input.price),
            isOnSale: input.isOnSale ?? false,
            salePrice: input.salePrice ? String(input.salePrice) : null,
            isAvailable: true,
        })
        .returning();

    return {
        id: created.id,
        productId: created.productId,
        name: created.name,
        price: Number(created.price),
        isOnSale: created.isOnSale!,
        salePrice: created.salePrice ? Number(created.salePrice) : null,
        isAvailable: created.isAvailable!,
        createdAt: created.createdAt!,
        updatedAt: created.updatedAt!,
    };
};
