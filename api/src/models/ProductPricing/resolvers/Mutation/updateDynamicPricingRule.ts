import type { MutationResolvers } from './../../../../generated/types.generated';
import { dynamicPricingRules as dynamicPricingRulesTable } from '@/database/schema/productPricing';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const updateDynamicPricingRule: NonNullable<MutationResolvers['updateDynamicPricingRule']> = async (
  _parent,
  { id, input },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins or business owners can update rules

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updatedAt: now
  };

  // Only include fields that are explicitly set in the input
  if (input.name !== undefined && input.name !== null) updateData.name = input.name;
  if (input.description !== undefined && input.description !== null) updateData.description = input.description;
  if (input.conditionConfig !== undefined && input.conditionConfig !== null) updateData.conditionConfig = input.conditionConfig;
  if (input.adjustmentConfig !== undefined && input.adjustmentConfig !== null) updateData.adjustmentConfig = input.adjustmentConfig;
  if (input.appliesTo !== undefined && input.appliesTo !== null) updateData.appliesTo = input.appliesTo;
  if (input.priority !== undefined && input.priority !== null) updateData.priority = input.priority;
  if (input.isActive !== undefined && input.isActive !== null) updateData.isActive = input.isActive;
  if (input.validFrom !== undefined && input.validFrom !== null) updateData.validFrom = input.validFrom;
  if (input.validUntil !== undefined && input.validUntil !== null) updateData.validUntil = input.validUntil;

  const rule = await db
    .update(dynamicPricingRulesTable)
    .set(updateData)
    .where(eq(dynamicPricingRulesTable.id, id))
    .returning();

  if (!rule || rule.length === 0 || !rule[0]) {
    throw new GraphQLError('Dynamic pricing rule not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return rule[0];
};
