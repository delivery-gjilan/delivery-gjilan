import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';

export const createSettlementRule: NonNullable<MutationResolvers['createSettlementRule']> = async (
  _parent,
  { input },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins or entity owners can create rules

  const repo = new SettlementRuleRepository(db);
  const now = new Date().toISOString();

  const rule = await repo.createRule({
    id: randomUUID(),
    ...input,
    canStackWith: input.canStackWith || [],
    priority: input.priority || 0,
    isActive: false,
    activatedAt: undefined,
    activatedBy: undefined,
    createdAt: now,
    updatedAt: now
  });

  return rule;
};
