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
  
  const cleanInput: Record<string, unknown> = {};
  if (input.name != null) cleanInput.name = input.name;
  if (input.direction != null) cleanInput.direction = input.direction;
  if (input.amountType != null) cleanInput.amountType = input.amountType;
  if (input.amount != null) cleanInput.amount = input.amount.toString();
  if (input.type != null) cleanInput.type = input.type;
  if (input.isActive != null) cleanInput.isActive = input.isActive;
  if (input.notes !== undefined) cleanInput.notes = input.notes || null;
  if (input.maxAmount !== undefined) cleanInput.maxAmount = input.maxAmount != null ? input.maxAmount.toString() : null;
  
    const rule = await repo.updateRule(id, cleanInput);
    return rule as any;
};
