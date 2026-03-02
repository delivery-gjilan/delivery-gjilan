import { useQuery } from '@apollo/client';
import { GET_STORE_STATUS } from '@/graphql/operations/store';

interface StoreStatus {
    isStoreClosed: boolean;
    closedMessage?: string | null;
    bannerEnabled: boolean;
    bannerMessage?: string | null;
    bannerType: string;
}

export function useStoreStatus() {
    const { data, loading } = useQuery<{ getStoreStatus: StoreStatus }>(
        GET_STORE_STATUS,
        { pollInterval: 30_000 },
    );

    return {
        isStoreClosed: data?.getStoreStatus?.isStoreClosed ?? false,
        closedMessage: data?.getStoreStatus?.closedMessage ?? null,
        bannerEnabled: data?.getStoreStatus?.bannerEnabled ?? false,
        bannerMessage: data?.getStoreStatus?.bannerMessage ?? null,
        bannerType: data?.getStoreStatus?.bannerType ?? 'INFO',
        loading,
    };
}
