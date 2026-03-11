import type { QueryResolvers } from './../../../../generated/types.generated';
import { PricingService } from '@/services/PricingService';
import { GraphQLError } from 'graphql';

export const calculateProductPrice: NonNullable<QueryResolvers['calculateProductPrice']> = async (
  _parent,
  { productId },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const pricingService = new PricingService(db);
  const finalPrice = await pricingService.calculateProductPrice(productId);

  return finalPrice.toString();
};
