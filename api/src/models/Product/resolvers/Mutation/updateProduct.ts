import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { products as productTable } from '../../../../../database/schema/products';
import { eq } from 'drizzle-orm';

export const updateProduct: NonNullable<MutationResolvers['updateProduct']> = async (_parent, { id, input }) => {
    const updateData: {
        categoryId?: number;
        name?: string;
        description?: string | null;
        imageUrl?: string | null;
        price?: string;
        isOnSale?: boolean;
        salePrice?: string | null;
        isAvailable?: boolean;
        updatedAt?: string;
    } = {
        updatedAt: new Date().toISOString(),
    };

    if (input.categoryId !== null && input.categoryId !== undefined) updateData.categoryId = Number(input.categoryId);
    if (input.name !== null && input.name !== undefined) updateData.name = input.name;
    if (input.description !== null && input.description !== undefined) updateData.description = input.description;
    if (input.imageUrl !== null && input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.price !== null && input.price !== undefined) updateData.price = String(input.price);
    if (input.isOnSale !== null && input.isOnSale !== undefined) updateData.isOnSale = input.isOnSale;
    if (input.salePrice !== null && input.salePrice !== undefined) updateData.salePrice = String(input.salePrice);
    if (input.isAvailable !== null && input.isAvailable !== undefined) updateData.isAvailable = input.isAvailable;

    const [updated] = await db
        .update(productTable)
        .set(updateData)
        .where(eq(productTable.id, Number(id)))
        .returning();

    if (!updated) {
        throw new Error('Product not found');
    }

    return {
        id: updated.id,
        businessId: updated.businessId,
        categoryId: updated.categoryId,
        name: updated.name,
        description: updated.description,
        imageUrl: updated.imageUrl,
        price: Number(updated.price),
        isOnSale: updated.isOnSale!,
        salePrice: updated.salePrice ? Number(updated.salePrice) : null,
        isAvailable: updated.isAvailable!,
        createdAt: updated.createdAt!,
        updatedAt: updated.updatedAt!,
    };
};
