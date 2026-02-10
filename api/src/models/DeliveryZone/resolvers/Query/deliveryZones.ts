import type { QueryResolvers } from './../../../../generated/types.generated';

export const deliveryZones: NonNullable<QueryResolvers['deliveryZones']> = async (_parent, _args, { deliveryZoneService }) => {
        return deliveryZoneService.getAllZones();
};