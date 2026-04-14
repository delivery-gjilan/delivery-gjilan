import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';
import { cache, coalesce } from '@/lib/cache';

const DEFAULT_STORE_STATUS = {
  isStoreClosed: false,
  closedMessage: 'We are too busy at the moment. Please come back later!',
  bannerEnabled: false,
  bannerMessage: null,
  bannerType: 'INFO',
  dispatchModeEnabled: false,
  googleMapsNavEnabled: false,
  inventoryModeEnabled: false,
  earlyDispatchLeadMinutes: 5,
  businessGracePeriodMinutes: 0,
};

export const getStoreStatus: NonNullable<QueryResolvers['getStoreStatus']> = async (
  _parent,
  _args,
  _ctx
): Promise<any> => {
  const cached = await cache.get<typeof DEFAULT_STORE_STATUS>(cache.keys.storeStatus());
  if (cached) return cached;

  const result = await coalesce(cache.keys.storeStatus(), async () => {
    const db = await getDB();
    const settings = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 'default'))
      .limit(1);

    if (settings.length === 0) return DEFAULT_STORE_STATUS;

    return {
      isStoreClosed: settings[0].isStoreClosed,
      closedMessage: settings[0].closedMessage,
      bannerEnabled: settings[0].bannerEnabled,
      bannerMessage: settings[0].bannerMessage,
      bannerType: (settings[0].bannerType || 'info').toUpperCase(),
      dispatchModeEnabled: settings[0].dispatchModeEnabled,
      googleMapsNavEnabled: settings[0].googleMapsNavEnabled,
      inventoryModeEnabled: settings[0].inventoryModeEnabled,
      earlyDispatchLeadMinutes: settings[0].earlyDispatchLeadMinutes,
      businessGracePeriodMinutes: settings[0].businessGracePeriodMinutes,
    };
  });

  await cache.set(cache.keys.storeStatus(), result, cache.TTL.STORE_STATUS);
  return result;
};