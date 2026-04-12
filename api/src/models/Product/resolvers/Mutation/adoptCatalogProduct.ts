import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { products } from '@/database/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Adopts a catalog product (from a MARKET business) into another business's menu
 * at a custom price.  Creates a new product row with sourceProductId pointing
 * to the original, inheriting name/image but using the provided price.
 */
export const adoptCatalogProduct: NonNullable<MutationResolvers['adoptCatalogProduct']> = async (
    _parent,
    { input },
    { db, role },
) => {
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        throw new GraphQLError('Only platform admins can adopt catalog products', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const { businessId, sourceProductId, categoryId, price } = input;

    // Validate source product exists and is not deleted
    const [sourceProduct] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, sourceProductId), eq(products.isDeleted, false)))
        .limit(1);

    if (!sourceProduct) {
        throw new GraphQLError('Source product not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    // Check if this business already adopted this product
    const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                eq(products.sourceProductId, sourceProductId),
                eq(products.isDeleted, false),
            ),
        )
        .limit(1);

    if (existing) {
        throw new GraphQLError('This product has already been adopted by this business', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    // Create the adopted product — inherits name/image from source, custom price
    const [created] = await db
        .insert(products)
        .values({
            businessId,
            categoryId,
            name: sourceProduct.name,
            description: sourceProduct.description,
            imageUrl: sourceProduct.imageUrl,
            basePrice: price,
            sourceProductId,
            isAvailable: true,
            isDeleted: false,
        })
        .returning();

    return {
        ...created,
        variantGroupId: created.groupId ?? undefined,
        isOffer: created.isOffer ?? false,
        price: Number(created.basePrice),
        effectivePrice: Number(created.basePrice),
        markupPrice: created.markupPrice ?? null,
        nightMarkedupPrice: created.nightMarkedupPrice ?? null,
        saleDiscountPercentage: created.saleDiscountPercentage ?? null,
        isOnSale: created.isOnSale ?? false,
        isAvailable: created.isAvailable ?? true,
        createdAt: created.createdAt ?? new Date().toISOString(),
        updatedAt: created.updatedAt ?? new Date().toISOString(),
        optionGroups: [],
        variants: [],
    };
};