import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const updateSettlementRule: NonNullable<MutationResolvers['updateSettlementRule']> = async (
  _parent,
  { id, input },
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
  
  // Convert InputMaybe types to proper undefined
  const cleanInput: Record<string, unknown> = {};
  if (input.config !== undefined && input.config !== null) cleanInput.config = input.config;
  if (input.canStackWith !== undefined && input.canStackWith !== null) cleanInput.canStackWith = input.canStackWith;
  if (input.priority !== undefined && input.priority !== null) cleanInput.priority = input.priority;
  if (input.notes !== undefined && input.notes !== null) cleanInput.notes = input.notes;
  
  const rule = await repo.updateRule(id, cleanInput);

  return rule;
};
