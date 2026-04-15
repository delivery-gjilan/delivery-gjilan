import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import type { StoreStatusPayload } from '@/lib/pubsub';

export const storeStatusUpdated: NonNullable<SubscriptionResolvers['storeStatusUpdated']> = {
  subscribe: (() => {
    return subscribe(pubsub, topics.storeStatusChanged());
  }) as any,
  resolve: (payload: StoreStatusPayload) => {
    return {
      isStoreClosed: payload.isStoreClosed,
      closedMessage: payload.closedMessage ?? null,
      bannerEnabled: payload.bannerEnabled,
      bannerMessage: payload.bannerMessage ?? null,
      bannerType: (payload.bannerType || 'INFO').toUpperCase() as any, //mi ndreq anyt
      dispatchModeEnabled: (payload as any).dispatchModeEnabled ?? false,
      googleMapsNavEnabled: (payload as any).googleMapsNavEnabled ?? false,
      inventoryModeEnabled: (payload as any).inventoryModeEnabled ?? false,
      earlyDispatchLeadMinutes: (payload as any).earlyDispatchLeadMinutes ?? 5,
      businessGracePeriodMinutes: (payload as any).businessGracePeriodMinutes ?? 0,
      directDispatchEnabled: (payload as any).directDispatchEnabled ?? false,
      directDispatchDriverReserve: (payload as any).directDispatchDriverReserve ?? 2,
    };
  },
};