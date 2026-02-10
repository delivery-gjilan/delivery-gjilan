import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const createDeliveryZone: NonNullable<MutationResolvers['createDeliveryZone']> = async (
    _parent,
    { input },
    { deliveryZoneService, userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can create delivery zones', { extensions: { code: 'FORBIDDEN' } });
    }
    return deliveryZoneService.createZone(input);
};

export const updateDeliveryZone: NonNullable<MutationResolvers['updateDeliveryZone']> = async (
    _parent,
    { id, input },
    { deliveryZoneService, userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can update delivery zones', { extensions: { code: 'FORBIDDEN' } });
    }
    return deliveryZoneService.updateZone(id, input);
};

export const deleteDeliveryZone: NonNullable<MutationResolvers['deleteDeliveryZone']> = async (
    _parent,
    { id },
    { deliveryZoneService, userData }
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can delete delivery zones', { extensions: { code: 'FORBIDDEN' } });
    }
    return deliveryZoneService.deleteZone(id);
};
