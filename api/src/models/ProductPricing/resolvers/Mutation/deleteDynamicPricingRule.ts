import type { MutationResolvers } from './../../../../generated/types.generated';
import { dynamicPricingRules as dynamicPricingRulesTable } from '@/database/schema/productPricing';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const deleteDynamicPricingRule: NonNullable<MutationResolvers['deleteDynamicPricingRule']> = async (
  _parent,
  { id },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins or business owners can delete rules

  const result = await db
    .delete(dynamicPricingRulesTable)
    .where(eq(dynamicPricingRulesTable.id, id))
    .returning({ id: dynamicPricingRulesTable.id });

  return result.length > 0;
};
