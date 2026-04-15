import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';
import { publish, pubsub, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';
import logger from '@/lib/logger';

const log = logger.child({ module: 'updateStoreStatus' });

export const updateStoreStatus: NonNullable<MutationResolvers['updateStoreStatus']> = async (
  _parent,
  { input },
  ctx
) => {
  if (ctx.role !== 'SUPER_ADMIN') {
    throw new GraphQLError('Only super admins can update store status', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  const db = await getDB();

  const updateData: Record<string, any> = {
    isStoreClosed: input.isStoreClosed,
    closedMessage: input.closedMessage || 'We are too busy at the moment. Please come back later!',
    updatedAt: new Date().toISOString(),
  };

  // Only update banner fields if they were explicitly provided
  if (input.bannerEnabled !== undefined && input.bannerEnabled !== null) {
    updateData.bannerEnabled = input.bannerEnabled;
  }
  if (input.bannerMessage !== undefined) {
    updateData.bannerMessage = input.bannerMessage;
  }
  if (input.bannerType) {
    updateData.bannerType = input.bannerType.toLowerCase();
  }
  if (input.dispatchModeEnabled !== undefined && input.dispatchModeEnabled !== null) {
    updateData.dispatchModeEnabled = input.dispatchModeEnabled;
  }
  if (input.googleMapsNavEnabled !== undefined && input.googleMapsNavEnabled !== null) {
    updateData.googleMapsNavEnabled = input.googleMapsNavEnabled;
  }
  if (input.inventoryModeEnabled !== undefined && input.inventoryModeEnabled !== null) {
    updateData.inventoryModeEnabled = input.inventoryModeEnabled;
  }
  if (input.earlyDispatchLeadMinutes !== undefined && input.earlyDispatchLeadMinutes !== null) {
    updateData.earlyDispatchLeadMinutes = input.earlyDispatchLeadMinutes;
  }
  if (input.businessGracePeriodMinutes !== undefined && input.businessGracePeriodMinutes !== null) {
    updateData.businessGracePeriodMinutes = input.businessGracePeriodMinutes;
  }
  if (input.directDispatchEnabled !== undefined && input.directDispatchEnabled !== null) {
    updateData.directDispatchEnabled = input.directDispatchEnabled;
  }
  if (input.directDispatchDriverReserve !== undefined && input.directDispatchDriverReserve !== null) {
    updateData.directDispatchDriverReserve = input.directDispatchDriverReserve;
  }
  if (input.farOrderThresholdKm !== undefined && input.farOrderThresholdKm !== null) {
    updateData.farOrderThresholdKm = input.farOrderThresholdKm;
  }
  if (input.gasPriorityWindowSeconds !== undefined && input.gasPriorityWindowSeconds !== null) {
    updateData.gasPriorityWindowSeconds = input.gasPriorityWindowSeconds;
  }

  let current;
  try {
    // Check if settings row exists
    const existing = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 'default'))
      .limit(1);

    if (existing.length === 0) {
      // Insert new settings row
      await db.insert(storeSettings).values({
        id: 'default',
        ...updateData,
      });
    } else {
      // Update existing settings
      await db
        .update(storeSettings)
        .set(updateData)
        .where(eq(storeSettings.id, 'default'));
    }

    // Re-read the current state to return complete data
    current = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 'default'))
      .limit(1);
  } catch (error) {
    log.error({ error }, 'storeSettings mutation failed');
    throw new GraphQLError('Store settings schema is out of sync. Run latest migrations and retry.', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  const row = current[0]!;
  const result = {
    isStoreClosed: row.isStoreClosed,
    closedMessage: row.closedMessage,
    bannerEnabled: row.bannerEnabled,
    bannerMessage: row.bannerMessage,
    bannerType: (row.bannerType || 'info').toUpperCase(),
    dispatchModeEnabled: row.dispatchModeEnabled,
    googleMapsNavEnabled: row.googleMapsNavEnabled,
    inventoryModeEnabled: row.inventoryModeEnabled,
    earlyDispatchLeadMinutes: row.earlyDispatchLeadMinutes,
    businessGracePeriodMinutes: row.businessGracePeriodMinutes,
    directDispatchEnabled: row.directDispatchEnabled,
    directDispatchDriverReserve: row.directDispatchDriverReserve,
    farOrderThresholdKm: row.farOrderThresholdKm,
    gasPriorityWindowSeconds: row.gasPriorityWindowSeconds,
  };

  // Broadcast to all subscribed clients
  publish(pubsub, topics.storeStatusChanged(), {
    isStoreClosed: result.isStoreClosed,
    closedMessage: result.closedMessage,
    bannerEnabled: result.bannerEnabled,
    bannerMessage: result.bannerMessage,
    bannerType: result.bannerType,
    dispatchModeEnabled: result.dispatchModeEnabled,
    googleMapsNavEnabled: result.googleMapsNavEnabled,
    inventoryModeEnabled: result.inventoryModeEnabled,
    earlyDispatchLeadMinutes: result.earlyDispatchLeadMinutes,
    businessGracePeriodMinutes: result.businessGracePeriodMinutes,
    directDispatchEnabled: result.directDispatchEnabled,
    directDispatchDriverReserve: result.directDispatchDriverReserve,
    farOrderThresholdKm: result.farOrderThresholdKm,
    gasPriorityWindowSeconds: result.gasPriorityWindowSeconds,
  } as any);

  await cache.invalidateStoreStatus();

  return result as any;
};