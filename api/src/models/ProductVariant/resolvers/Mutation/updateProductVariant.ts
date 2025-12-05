import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { productVariants as productVariantTable } from '../../../../../database/schema/productVariants';
import { eq } from 'drizzle-orm';

export const updateProductVariant: NonNullable<MutationResolvers['updateProductVariant']> = async (
    _parent,
    { id, input },
) => {
    const updateData: {
        name?: string;
        price?: string;
        isOnSale?: boolean;
        salePrice?: string | null;
        isAvailable?: boolean;
        updatedAt?: string;
    } = {
        updatedAt: new Date().toISOString(),
    };

    if (input.name !== null && input.name !== undefined) updateData.name = input.name;
    if (input.price !== null && input.price !== undefined) updateData.price = String(input.price);
    if (input.isOnSale !== null && input.isOnSale !== undefined) updateData.isOnSale = input.isOnSale;
    if (input.salePrice !== null && input.salePrice !== undefined) updateData.salePrice = String(input.salePrice);
    if (input.isAvailable !== null && input.isAvailable !== undefined) updateData.isAvailable = input.isAvailable;

    const [updated] = await db
        .update(productVariantTable)
        .set(updateData)
        .where(eq(productVariantTable.id, Number(id)))
        .returning();

    if (!updated) {
        throw new Error('Product variant not found');
    }

    return {
        id: updated.id,
        productId: updated.productId,
        name: updated.name,
        price: Number(updated.price),
        isOnSale: updated.isOnSale!,
        salePrice: updated.salePrice ? Number(updated.salePrice) : null,
        isAvailable: updated.isAvailable!,
        createdAt: updated.createdAt!,
        updatedAt: updated.updatedAt!,
    };
};
