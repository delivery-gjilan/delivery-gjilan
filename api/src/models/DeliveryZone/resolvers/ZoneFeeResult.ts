import type { ZoneFeeResultResolvers } from './../../../generated/types.generated';

export const ZoneFeeResult: ZoneFeeResultResolvers = {
  zone: (parent) => parent.zone,
  totalFee: (parent) => parent.totalFee,
  baseDeliveryFee: (parent) => parent.baseDeliveryFee,
};