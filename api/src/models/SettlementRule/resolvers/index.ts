import { settlementRuleQueries } from './Query';
import { settlementRuleMutations } from './Mutation';
import { SettlementRule } from './SettlementRule';

export const settlementRuleResolvers = {
  Query: settlementRuleQueries,
  Mutation: settlementRuleMutations,
  SettlementRule,
};
