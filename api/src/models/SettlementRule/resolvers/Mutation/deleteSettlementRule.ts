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

  if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
    throw new GraphQLError('Only platform admins can manage settlement rules', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  const repo = new SettlementRuleRepository(db);
  const result = await repo.deleteRule(id);

  return result;
};
