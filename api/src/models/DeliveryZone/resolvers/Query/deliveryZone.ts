import type { QueryResolvers } from './../../../../generated/types.generated';

export const deliveryZone: NonNullable<QueryResolvers['deliveryZone']> = async (_parent, { id }, { deliveryZoneService }) => {
        return deliveryZoneService.getZoneById(id);
};