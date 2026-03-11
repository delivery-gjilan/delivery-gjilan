import type { QueryResolvers } from './../../../../generated/types.generated';
import { productPricing as productPricingTable } from '@/database/schema/productPricing';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const productPricing: NonNullable<QueryResolvers['productPricing']> = async (_parent, { productId }, { db, userData }) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const pricing = await db.query.productPricing.findFirst({
    where: eq(productPricingTable.productId, productId)
  });

  if (!pricing) {
    throw new GraphQLError('Product pricing not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return pricing;
};
