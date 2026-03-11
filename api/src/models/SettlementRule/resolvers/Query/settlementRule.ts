import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const settlementRule: NonNullable<QueryResolvers['settlementRule']> = async (_parent, { id }, { db, userData }) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const repo = new SettlementRuleRepository(db);
  const rule = await repo.getRuleById(id);

  if (!rule) {
    throw new GraphQLError('Settlement rule not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return rule;
};
