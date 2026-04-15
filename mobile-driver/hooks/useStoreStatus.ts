import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_STORE_STATUS, STORE_STATUS_UPDATED } from '@/graphql/operations/store';

interface StoreStatus {
    isStoreClosed: boolean;
    closedMessage?: string | null;
    bannerEnabled: boolean;
    bannerMessage?: string | null;
    bannerType: string;
    dispatchModeEnabled: boolean;
    googleMapsNavEnabled: boolean;
    inventoryModeEnabled: boolean;
    earlyDispatchLeadMinutes: number;
}

export function useStoreStatus() {
    const { data, loading, client } = useQuery<{ getStoreStatus: StoreStatus }>(
        GET_STORE_STATUS,
        { pollInterval: 30_000 },
    );

    useSubscription<{ storeStatusUpdated: StoreStatus }>(STORE_STATUS_UPDATED, {
        onData: ({ data: subData }) => {
            const updated = subData.data?.storeStatusUpdated;
            if (!updated) return;
            client.cache.updateQuery<{ getStoreStatus: StoreStatus }>(
                { query: GET_STORE_STATUS },
                (existing) => ({
                    getStoreStatus: { ...(existing?.getStoreStatus ?? {}), ...updated },
                }),
            );
        },
    });

    return {
        isStoreClosed: data?.getStoreStatus?.isStoreClosed ?? false,
        closedMessage: data?.getStoreStatus?.closedMessage ?? null,
        bannerEnabled: data?.getStoreStatus?.bannerEnabled ?? false,
        bannerMessage: data?.getStoreStatus?.bannerMessage ?? null,
        bannerType: data?.getStoreStatus?.bannerType ?? 'INFO',
        dispatchModeEnabled: data?.getStoreStatus?.dispatchModeEnabled ?? false,
        googleMapsNavEnabled: data?.getStoreStatus?.googleMapsNavEnabled ?? false,
        inventoryModeEnabled: data?.getStoreStatus?.inventoryModeEnabled ?? false,
        earlyDispatchLeadMinutes: data?.getStoreStatus?.earlyDispatchLeadMinutes ?? 5,
        loading,
    };
}
