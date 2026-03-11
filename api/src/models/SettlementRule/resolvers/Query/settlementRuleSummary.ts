import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const settlementRuleSummary: NonNullable<QueryResolvers['settlementRuleSummary']> = async (
  _parent,
  { entityType, entityId },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const repo = new SettlementRuleRepository(db);
  const summary = await repo.getRuleSummary(entityType, entityId);

  return summary;
};
