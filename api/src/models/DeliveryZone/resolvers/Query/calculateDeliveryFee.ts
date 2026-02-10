import type { QueryResolvers } from './../../../../generated/types.generated';

export const calculateDeliveryFee: NonNullable<QueryResolvers['calculateDeliveryFee']> = async (
        _parent,
        { latitude, longitude, baseDeliveryFee },
        { deliveryZoneService }
) => {
        return deliveryZoneService.calculateDeliveryFee(latitude, longitude, baseDeliveryFee);
};