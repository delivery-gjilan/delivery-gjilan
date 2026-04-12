import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { products } from '@/database/schema';
import { businesses } from '@/database/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Returns all active, non-deleted products from MARKET-type businesses.
 * These are eligible for adoption by other businesses at custom prices.
 */
export const catalogProducts: NonNullable<QueryResolvers['catalogProducts']> = async (
    _parent,
    _arg,
    { db, role },
) => {
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        throw new GraphQLError('Only platform admins can view catalog products', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // Find all MARKET businesses
    const marketBusinesses = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.businessType, 'MARKET'));

    if (marketBusinesses.length === 0) return [];

    const marketIds = marketBusinesses.map((b) => b.id);

    const rows = await db
        .select()
        .from(products)
        .where(
            and(
                inArray(products.businessId, marketIds),
                eq(products.isDeleted, false),
            ),
        );

    return rows.map((p) => ({
        ...p,
        variantGroupId: p.groupId ?? undefined,
        isOffer: p.isOffer ?? false,
        price: Number(p.basePrice),
        effectivePrice: Number(p.basePrice),
        markupPrice: p.markupPrice ?? null,
        nightMarkedupPrice: p.nightMarkedupPrice ?? null,
        saleDiscountPercentage: p.saleDiscountPercentage ?? null,
        isOnSale: p.isOnSale ?? false,
        isAvailable: p.isAvailable ?? true,
        createdAt: p.createdAt ?? new Date().toISOString(),
        updatedAt: p.updatedAt ?? new Date().toISOString(),
        optionGroups: [],
        variants: [],
    }));
};