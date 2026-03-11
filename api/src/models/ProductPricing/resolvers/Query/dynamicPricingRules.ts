import type { QueryResolvers } from './../../../../generated/types.generated';
import { dynamicPricingRules as dynamicPricingRulesTable } from '@/database/schema/productPricing';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const dynamicPricingRules: NonNullable<QueryResolvers['dynamicPricingRules']> = async (
  _parent,
  { businessId },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const rules = await db.query.dynamicPricingRules.findMany({
    where: businessId ? eq(dynamicPricingRulesTable.businessId, businessId) : undefined
  });

  return rules;
};
