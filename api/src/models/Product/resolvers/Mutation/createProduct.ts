import type { MutationResolvers } from '../../../../generated/types.generated';
import { db } from '../../../../lib/utils/db';
import { products as productTable } from '../../../../../database/schema/products';

export const createProduct: NonNullable<MutationResolvers['createProduct']> = async (_parent, { input }, _ctx) => {
    const [created] = await db
        .insert(productTable)
        .values({
            businessId: Number(input.businessId),
            categoryId: Number(input.categoryId),
            name: input.name,
            description: input.description ?? null,
            imageUrl: input.imageUrl ?? null,
            price: String(input.price),
            isOnSale: input.isOnSale ?? false,
            salePrice: input.salePrice ? String(input.salePrice) : null,
            isAvailable: true,
        })
        .returning();

    return {
        id: created.id,
        businessId: created.businessId,
        categoryId: created.categoryId,
        name: created.name,
        description: created.description,
        imageUrl: created.imageUrl,
        price: Number(created.price),
        isOnSale: created.isOnSale!,
        salePrice: created.salePrice ? Number(created.salePrice) : null,
        isAvailable: created.isAvailable!,
        createdAt: created.createdAt!,
        updatedAt: created.updatedAt!,
    };
};
