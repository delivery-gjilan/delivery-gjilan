import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { products } from '@/database/schema/products';
import { productCategories } from '@/database/schema/productCategories';
import { eq, and } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const myInventory: NonNullable<QueryResolvers['myInventory']> = async (
    _parent,
    { businessId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can view inventory', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

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
            categoryName: productCategories.name,
        })
        .from(personalInventory)
        .innerJoin(products, eq(personalInventory.productId, products.id))
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(
            and(
                eq(personalInventory.businessId, businessId),
                eq(products.isDeleted, false),
            ),
        );

    return rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        productImageUrl: row.productImageUrl,
        productBasePrice: Number(row.productBasePrice),
        categoryName: row.categoryName,
        quantity: row.quantity,
        lowStockThreshold: row.lowStockThreshold,
        costPrice: row.costPrice ? Number(row.costPrice) : null,
        isLowStock: row.quantity <= (row.lowStockThreshold ?? 2),
        updatedAt: row.updatedAt,
    }));
};
