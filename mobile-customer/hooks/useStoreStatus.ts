import { useQuery } from '@apollo/client/react';
import { GET_STORE_STATUS } from '@/graphql/operations/store';

export const useStoreStatus = () => {
    const { data, loading, error } = useQuery(GET_STORE_STATUS, {
        fetchPolicy: 'network-only', // Always fetch fresh on app open, no cache
    });

    return {
        isStoreClosed: data?.getStoreStatus?.isStoreClosed ?? false,
        closedMessage: data?.getStoreStatus?.closedMessage,
        loading,
        error,
    };
};
