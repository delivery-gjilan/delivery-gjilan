import { useQuery } from '@apollo/client/react';
import { GET_PRODUCTS, GET_PRODUCT } from '@/graphql/operations/products';

export function useProducts(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    return {
        products: data?.products || [],
        loading,
        error,
        refetch,
    };
}

export function useProduct(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCT, {
        variables: { id },
        skip: !id,
        fetchPolicy: 'cache-first',
    });

    return {
        product: data?.product || null,
        loading,
        error,
        refetch,
    };
}
