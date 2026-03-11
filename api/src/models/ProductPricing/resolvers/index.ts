import { productPricingQueries } from './Query';
import { productPricingMutations } from './Mutation';

export const productPricingResolvers = {
  Query: productPricingQueries,
  Mutation: productPricingMutations
};
