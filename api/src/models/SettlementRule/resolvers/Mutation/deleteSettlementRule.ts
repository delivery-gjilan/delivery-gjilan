import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const deleteSettlementRule: NonNullable<MutationResolvers['deleteSettlementRule']> = async (
  _parent,
  { id },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins can delete rules

  const repo = new SettlementRuleRepository(db);
  const result = await repo.deleteRule(id);

  return result;
};
