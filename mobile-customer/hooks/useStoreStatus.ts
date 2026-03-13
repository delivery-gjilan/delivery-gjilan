import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_STORE_STATUS, STORE_STATUS_UPDATED } from '@/graphql/operations/store';

export const useStoreStatus = () => {
    const { data, loading, error, subscribeToMore } = useQuery(GET_STORE_STATUS, {
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        const unsubscribe = subscribeToMore({
            document: STORE_STATUS_UPDATED,
            updateQuery: (prev: any, { subscriptionData }: any) => {
                if (!subscriptionData.data?.storeStatusUpdated) return prev;
                return {
                    ...prev,
                    getStoreStatus: subscriptionData.data.storeStatusUpdated,
                };
            },
        } as any);
        return unsubscribe;
    }, [subscribeToMore]);

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
