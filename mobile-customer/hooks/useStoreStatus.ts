import { useQuery } from '@apollo/client/react';
import { GET_STORE_STATUS } from '@/graphql/operations/store';

export const useStoreStatus = () => {
    const { data, loading, error } = useQuery(GET_STORE_STATUS, {
        fetchPolicy: 'network-only', // Always fetch fresh on app open, no cache
    });

    const status = data?.getStoreStatus;

    return {
        isStoreClosed: status?.isStoreClosed ?? false,
        closedMessage: status?.closedMessage,
        bannerEnabled: status?.bannerEnabled ?? false,
        bannerMessage: status?.bannerMessage ?? null,
        bannerType: (status?.bannerType ?? 'INFO') as 'INFO' | 'WARNING' | 'SUCCESS',
        loading,
        error,
    };
};
