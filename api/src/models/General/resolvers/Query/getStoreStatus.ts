import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB, getDBWithUrl } from '@/database';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq } from 'drizzle-orm';

export const getStoreStatus: NonNullable<QueryResolvers['getStoreStatus']> = async (
  _parent,
  _args,
  _ctx
) => {

  try {
    const dbWithUrl = await getDBWithUrl(_args.url);
    const data = await dbWithUrl.query.businesses.findFirst();
    console.log('Data from getStoreStatus with URL:', data);

  } catch(e){
    console.log("errorjere me kriju connection", e)
  }




  const db = await getDB();

  // Get the store settings (single row with id 'default')
  const settings = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 'default'))
    .limit(1);

  if (settings.length === 0) {
    // If no settings exist yet, return default values
    return {
      isStoreClosed: false,
      closedMessage: 'We are too busy at the moment. Please come back later!',
      bannerEnabled: false,
      bannerMessage: null,
      bannerType: 'INFO',
    };
  }

  return {
    isStoreClosed: settings[0].isStoreClosed,
    closedMessage: settings[0].closedMessage,
    bannerEnabled: settings[0].bannerEnabled,
    bannerMessage: settings[0].bannerMessage,
    bannerType: (settings[0].bannerType || 'info').toUpperCase(),
  };
};