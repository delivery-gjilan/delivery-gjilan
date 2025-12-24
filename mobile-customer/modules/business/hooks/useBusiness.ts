import { useQuery } from '@apollo/client/react';
import { GET_BUSINESS } from '@/graphql/operations/businesses';

export function useBusiness(businessId: string) {
    const { data, loading, error } = useQuery(GET_BUSINESS, {
        variables: { id: businessId },
        skip: !businessId,
    });

    return {
        business: data?.business,
        loading,
        error,
    };
}
