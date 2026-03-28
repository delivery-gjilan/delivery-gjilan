import { useQuery } from '@apollo/client/react';
import { GET_BUSINESSES } from '@/graphql/operations/businesses';

export function useBusinesses() {
    const { data, loading, error, refetch } = useQuery(GET_BUSINESSES, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    return {
        businesses: data?.businesses || [],
        loading,
        error,
        refetch,
    };
}
