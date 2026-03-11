import type { MutationResolvers } from './../../../../generated/types.generated';
import { PricingService } from '@/services/PricingService';
import { GraphQLError } from 'graphql';

export const updateProductPricing: NonNullable<MutationResolvers['updateProductPricing']> = async (
  _parent,
  { productId, businessId, input },
  { db, userData }
) => {
  if (!userData?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // TODO: Add authorization check - only admins or business owners can update pricing

  const pricingService = new PricingService(db);

  const newBusinessPrice = input.businessPrice 
    ? parseFloat(input.businessPrice) 
    : 0;
  
  const newPlatformMarkup = input.platformMarkup 
    ? parseFloat(input.platformMarkup) 
    : 0;

  try {
    // Try to update existing pricing
    const updated = await pricingService.updateProductPricing(
      productId,
      newBusinessPrice,
      newPlatformMarkup,
      userData.userId,
      input.reason || undefined
    );
    return updated;
  } catch (error: any) {
    // If no existing pricing, create it
    if (error.message?.includes('No pricing record found')) {
      const created = await pricingService.createProductPricing(
        productId,
        businessId,
        newBusinessPrice,
        newPlatformMarkup,
        userData.userId
      );
      return created;
    }
    throw new GraphQLError(error.message, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
};
