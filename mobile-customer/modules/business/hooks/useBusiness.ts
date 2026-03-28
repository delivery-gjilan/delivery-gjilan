import { useQuery } from '@apollo/client/react';
import { GET_BUSINESS } from '@/graphql/operations/businesses';

export function useBusiness(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_BUSINESS, {
        variables: { id: businessId },
        skip: !businessId,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    return {
        business: data?.business,
        loading,
        error,
        refetch,
    };
}
