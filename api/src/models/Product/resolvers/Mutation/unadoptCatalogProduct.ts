import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { products } from '@/database/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

/**
 * Removes an adopted catalog product by soft-deleting it.
 * Only works on products that have a sourceProductId (adopted products).
 */
export const unadoptCatalogProduct: NonNullable<MutationResolvers['unadoptCatalogProduct']> = async (
    _parent,
    { id },
    { db, role },
) => {
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        throw new GraphQLError('Only platform admins can unadopt catalog products', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // Verify this is an adopted product
    const [product] = await db
        .select({ id: products.id, sourceProductId: products.sourceProductId })
        .from(products)
        .where(and(eq(products.id, id), eq(products.isDeleted, false), isNotNull(products.sourceProductId)))
        .limit(1);

    if (!product) {
        throw new GraphQLError('Adopted product not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    await db
        .update(products)
        .set({ isDeleted: true })
        .where(eq(products.id, id));

    return true;
};