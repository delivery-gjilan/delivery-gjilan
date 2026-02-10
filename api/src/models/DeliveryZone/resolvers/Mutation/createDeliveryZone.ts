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

export const createDeliveryZone: NonNullable<MutationResolvers['createDeliveryZone']> = async (_parent, { input }, ctx) => {
  try {
    console.log('Creating delivery zone with input:', JSON.stringify(input, null, 2));
    
    const zone = await ctx.deliveryZoneService.createZone({
      name: input.name,
      description: input.description || null,
      feeDelta: input.feeDelta,
      color: input.color || '#3b82f6',
      priority: input.priority || 0,
      isActive: input.isActive ?? true,
      geometry: input.geometry,
    });
    
    console.log('Created zone:', zone);
    
    if (!zone) {
      throw new Error('Zone creation returned null');
    }
    
    return normalizeZone(zone);
  } catch (error) {
    console.error('Error in createDeliveryZone resolver:', error);
    throw error;
  }
};