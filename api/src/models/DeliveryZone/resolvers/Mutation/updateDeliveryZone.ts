import type { MutationResolvers } from './../../../../generated/types.generated';

const toIsoString = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    let normalized = value.includes('T') ? value : value.replace(' ', 'T');
    normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');

    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return value;
};

const normalizeZone = (zone: any) => {
  if (!zone) return zone;
  return {
    ...zone,
    createdAt: toIsoString(zone.createdAt),
    updatedAt: toIsoString(zone.updatedAt),
  };
};

export const updateDeliveryZone: NonNullable<MutationResolvers['updateDeliveryZone']> = async (_parent, { id, input }, ctx) => {
  const zone = await ctx.deliveryZoneService.updateZone(id, input);
  
  if (!zone) {
    throw new Error(`Delivery zone with id ${id} not found`);
  }
  
  return normalizeZone(zone);
};