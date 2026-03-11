import { readFileSync } from 'fs';
import { join } from 'path';

export const productPricingTypeDefs = readFileSync(
  join(__dirname, 'ProductPricing.graphql'),
  'utf-8'
);
