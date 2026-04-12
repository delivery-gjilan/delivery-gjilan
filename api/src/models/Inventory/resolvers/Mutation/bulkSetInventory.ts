import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { products } from '@/database/schema/products';
import { productCategories } from '@/database/schema/productCategories';
import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const bulkSetInventory: NonNullable<MutationResolvers['bulkSetInventory']> = async (
    _parent,
    { input },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can manage inventory', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (input.items.some((item) => item.quantity < 0)) {
        throw new GraphQLError('Quantity cannot be negative', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    const db = await getDB();

    // Upsert each item
    for (const item of input.items) {
        await db
            .insert(personalInventory)
            .values({
                businessId: input.businessId,
                productId: item.productId,
                quantity: item.quantity,
                costPrice: item.costPrice ?? undefined,
                lowStockThreshold: item.lowStockThreshold ?? 2,
                updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
                target: [personalInventory.businessId, personalInventory.productId],
                set: {
                    quantity: item.quantity,
                    ...(item.costPrice !== undefined && item.costPrice !== null
                        ? { costPrice: item.costPrice }
                        : {}),
                    ...(item.lowStockThreshold !== undefined && item.lowStockThreshold !== null
                        ? { lowStockThreshold: item.lowStockThreshold }
                        : {}),
                    updatedAt: new Date().toISOString(),
                },
            });
    }

    // Return all inventory items for the business
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
                eq(products.isDeleted, false),
            ),
        );

    return rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        productImageUrl: row.productImageUrl,
        productBasePrice: Number(row.productBasePrice),            productMarkupPrice: row.productMarkupPrice != null ? Number(row.productMarkupPrice) : null,
            productNightPrice: row.productNightPrice != null ? Number(row.productNightPrice) : null,        categoryName: row.categoryName,
        quantity: row.quantity,
        lowStockThreshold: row.lowStockThreshold,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
        isLowStock: row.quantity <= (row.lowStockThreshold ?? 2),
        updatedAt: row.updatedAt,
    }));
};
