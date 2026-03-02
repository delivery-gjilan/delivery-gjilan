import { useQuery } from '@apollo/client/react';
import { GET_PRODUCTS } from '@/graphql/operations/products';

export function useProducts(businessId: string) {
    const { data, loading, error } = useQuery(GET_PRODUCTS, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'cache-first',
    });

    return {
        products: data?.products,
        loading,
        error,
    };
}
