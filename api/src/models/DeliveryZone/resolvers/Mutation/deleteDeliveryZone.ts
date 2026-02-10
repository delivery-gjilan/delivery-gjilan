import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteDeliveryZone: NonNullable<MutationResolvers['deleteDeliveryZone']> = async (_parent, { id }, ctx) => {
  const success = await ctx.deliveryZoneService.deleteZone(id);
  return success;
};