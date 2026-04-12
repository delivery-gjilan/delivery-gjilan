import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { products } from '@/database/schema/products';
import { productCategories } from '@/database/schema/productCategories';
import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const setInventoryQuantity: NonNullable<MutationResolvers['setInventoryQuantity']> = async (
    _parent,
    { input },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can manage inventory', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (input.quantity < 0) {
        throw new GraphQLError('Quantity cannot be negative', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    const db = await getDB();

    // Verify product exists and belongs to business
    const productRows = await db
        .select({ id: products.id })
        .from(products)
        .where(
            and(
                eq(products.id, input.productId),
                eq(products.businessId, input.businessId),
                eq(products.isDeleted, false),
            ),
        )
        .limit(1);

    if (!productRows.length) {
        throw new GraphQLError('Product not found or does not belong to this business', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    // Upsert inventory
    await db
        .insert(personalInventory)
        .values({
            businessId: input.businessId,
            productId: input.productId,
            quantity: input.quantity,
            costPrice: input.costPrice ?? undefined,
            lowStockThreshold: input.lowStockThreshold ?? 2,
            updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
            target: [personalInventory.businessId, personalInventory.productId],
            set: {
                quantity: input.quantity,
                ...(input.costPrice !== undefined && input.costPrice !== null
                    ? { costPrice: input.costPrice }
                    : {}),
                ...(input.lowStockThreshold !== undefined && input.lowStockThreshold !== null
                    ? { lowStockThreshold: input.lowStockThreshold }
                    : {}),
                updatedAt: new Date().toISOString(),
            },
        });

    // Read back the row with product info
    const rows = await db
        .select({
            id: personalInventory.id,
            productId: personalInventory.productId,
            quantity: personalInventory.quantity,
            lowStockThreshold: personalInventory.lowStockThreshold,
            costPrice: personalInventory.costPrice,
            updatedAt: personalInventory.updatedAt,
            productName: products.name,
            productImageUrl: products.imageUrl,
            productBasePrice: products.basePrice,
            productMarkupPrice: products.markupPrice,
            productNightPrice: products.nightMarkedupPrice,
            categoryName: productCategories.name,
        })
        .from(personalInventory)
        .innerJoin(products, eq(personalInventory.productId, products.id))
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(
            and(
                eq(personalInventory.businessId, input.businessId),
                eq(personalInventory.productId, input.productId),
            ),
        )
        .limit(1);

    const row = rows[0]!;
    return {
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        productImageUrl: row.productImageUrl,
        productBasePrice: Number(row.productBasePrice),
        productMarkupPrice: row.productMarkupPrice != null ? Number(row.productMarkupPrice) : null,
        productNightPrice: row.productNightPrice != null ? Number(row.productNightPrice) : null,
        categoryName: row.categoryName,
        quantity: row.quantity,
        lowStockThreshold: row.lowStockThreshold,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
        isLowStock: row.quantity <= (row.lowStockThreshold ?? 2),
        updatedAt: row.updatedAt,
    };
};
