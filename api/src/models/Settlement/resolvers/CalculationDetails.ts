import type { CalculationDetailsResolvers } from './../../../generated/types.generated';

export const CalculationDetails: CalculationDetailsResolvers = {
  // GraphQL marks these as non-null JSON fields, so always provide a fallback.
  itemsBreakdown: (parent) => parent.itemsBreakdown ?? [],
  rulesApplied: (parent) => parent.rulesApplied ?? [],
};