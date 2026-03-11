import { updateProductPricing } from './updateProductPricing';
import { createDynamicPricingRule } from './createDynamicPricingRule';
import { updateDynamicPricingRule } from './updateDynamicPricingRule';
import { deleteDynamicPricingRule } from './deleteDynamicPricingRule';

export const productPricingMutations = {
  updateProductPricing,
  createDynamicPricingRule,
  updateDynamicPricingRule,
  deleteDynamicPricingRule
};
