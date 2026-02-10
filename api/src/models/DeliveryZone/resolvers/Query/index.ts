import type { QueryResolvers } from '@/generated/types.generated';

export const deliveryZones: NonNullable<QueryResolvers['deliveryZones']> = async (_parent, _args, { deliveryZoneService }) => {
    return deliveryZoneService.getAllZones();
};

export const deliveryZone: NonNullable<QueryResolvers['deliveryZone']> = async (_parent, { id }, { deliveryZoneService }) => {
    return deliveryZoneService.getZoneById(id);
};

export const calculateDeliveryFee: NonNullable<QueryResolvers['calculateDeliveryFee']> = async (
    _parent,
    { latitude, longitude, baseDeliveryFee },
    { deliveryZoneService }
) => {
    return deliveryZoneService.calculateDeliveryFee(latitude, longitude, baseDeliveryFee);
};
