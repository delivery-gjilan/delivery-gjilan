import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const deactivateSettlementRule: NonNullable<MutationResolvers['deactivateSettlementRule']> = async (
  _parent,
  { id },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins can deactivate rules

  const repo = new SettlementRuleRepository(db);
  const rule = await repo.deactivateRule(id);

  return rule;
};
