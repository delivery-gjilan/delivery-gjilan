import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const activateSettlementRule: NonNullable<MutationResolvers['activateSettlementRule']> = async (
  _parent,
  { id },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins can activate rules

  const repo = new SettlementRuleRepository(db);
  const rule = await repo.activateRule(id, userData.userId);

  return rule;
};
