import type { QueryResolvers } from './../../../../generated/types.generated';
import { productPricing as productPricingTable } from '@/database/schema/productPricing';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const productPricingByBusiness: NonNullable<QueryResolvers['productPricingByBusiness']> = async (
  _parent,
  { businessId },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const pricings = await db.query.productPricing.findMany({
    where: eq(productPricingTable.businessId, businessId)
  });

  return pricings;
};
