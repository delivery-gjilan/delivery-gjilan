import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';
import { publish, pubsub, topics } from '@/lib/pubsub';

export const updateStoreStatus: NonNullable<MutationResolvers['updateStoreStatus']> = async (
  _parent,
  { input },
  _ctx
) => {
  const db = await getDB();

  // Check if settings row exists
  const existing = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 'default'))
    .limit(1);

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
  const current = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 'default'))
    .limit(1);

  const row = current[0]!;
  const result = {
    isStoreClosed: row.isStoreClosed,
    closedMessage: row.closedMessage,
    bannerEnabled: row.bannerEnabled,
    bannerMessage: row.bannerMessage,
    bannerType: (row.bannerType || 'info').toUpperCase(),
  };

  // Broadcast to all subscribed clients
  publish(pubsub, topics.storeStatusChanged(), {
    isStoreClosed: result.isStoreClosed,
    closedMessage: result.closedMessage,
    bannerEnabled: result.bannerEnabled,
    bannerMessage: result.bannerMessage,
    bannerType: result.bannerType,
  });

  return result as any;
};