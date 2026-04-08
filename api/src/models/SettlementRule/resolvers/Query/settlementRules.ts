import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import { GraphQLError } from 'graphql';

export const settlementRules: NonNullable<QueryResolvers['settlementRules']> = async (
  _parent,
  { filter, limit, offset },
  { db, userData },
): Promise<any> => {
  if (!userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role!)) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const repo = new SettlementRuleRepository(db);

  const cleanFilter = filter
    ? {
        entityTypes: filter.entityTypes || undefined,
        type: filter.type || undefined,
        businessIds: (filter.businessIds as string[]) || undefined,
        promotionIds: (filter.promotionIds as string[]) || undefined,
        scopes: (filter.scopes as any[]) || undefined,
        isActive: filter.isActive ?? undefined,
      }
    : {};

  const rules = await repo.getRules(cleanFilter as any, limit ?? undefined, offset ?? undefined);

  return rules.map((rule) => ({
    ...rule,
    amount: parseFloat(rule.amount as any),
  }));
};
