import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';

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

  const updateData = {
    isStoreClosed: input.isStoreClosed,
    closedMessage: input.closedMessage || 'We are too busy at the moment. Please come back later!',
    updatedAt: new Date().toISOString(),
  };

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

  return {
    isStoreClosed: updateData.isStoreClosed,
    closedMessage: updateData.closedMessage,
  };
};