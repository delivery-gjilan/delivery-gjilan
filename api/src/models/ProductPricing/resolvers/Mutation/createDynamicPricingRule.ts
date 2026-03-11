import type { MutationResolvers } from './../../../../generated/types.generated';
import { dynamicPricingRules as dynamicPricingRulesTable } from '@/database/schema/productPricing';
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';

export const createDynamicPricingRule: NonNullable<MutationResolvers['createDynamicPricingRule']> = async (
  _parent,
  { input },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins or business owners can create rules

  const now = new Date().toISOString();

  // Convert appliesTo InputMaybe types
  const appliesTo = {
    categoryIds: input.appliesTo.categoryIds || undefined,
    subcategoryIds: input.appliesTo.subcategoryIds || undefined,
    productIds: input.appliesTo.productIds || undefined,
    allProducts: input.appliesTo.allProducts ?? undefined,
  };

  const rules = await db
    .insert(dynamicPricingRulesTable)
    .values({
      id: randomUUID(),
      name: input.name,
      description: input.description || null,
      businessId: input.businessId || null,
      conditionType: input.conditionType,
      conditionConfig: input.conditionConfig,
      adjustmentConfig: input.adjustmentConfig,
      appliesTo,
      priority: input.priority || 0,
      isActive: true,
      validFrom: input.validFrom || null,
      validUntil: input.validUntil || null,
      createdBy: userData.userId,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  if (!rules || rules.length === 0 || !rules[0]) {
    throw new GraphQLError('Failed to create dynamic pricing rule', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  return rules[0];
};
