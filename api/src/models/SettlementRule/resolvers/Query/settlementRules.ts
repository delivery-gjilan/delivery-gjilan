import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const settlementRules: NonNullable<QueryResolvers['settlementRules']> = async (_parent, { filter }, { db, userData }) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const repo = new SettlementRuleRepository(db);
  
  const cleanFilter = filter ? {
    entityType: filter.entityType || undefined,
    businessId: filter.businessId || undefined,
    promotionId: filter.promotionId || undefined,
    isActive: filter.isActive ?? undefined,
  } : {};
  
  const rules = await repo.getRules(cleanFilter);

  return rules;
};
