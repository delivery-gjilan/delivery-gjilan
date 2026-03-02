import { useQuery } from '@apollo/client/react';
import { GET_BUSINESSES, GET_BUSINESS } from '@/graphql/operations/businesses';

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

export function useBusiness(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_BUSINESS, {
        variables: { id },
        skip: !id,
    });

    return {
        business: data?.business || null,
        loading,
        error,
        refetch,
    };
}
