import { useQuery } from '@apollo/client/react';
import { GET_PRODUCTS, GET_PRODUCT } from '@/graphql/operations/products';

export function useProducts(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
        variables: { businessId },
        skip: !businessId,
        // Product lists don't change during a session. Serve from cache
        // instantly; only hit the network if this businessId has never been fetched.
        fetchPolicy: 'cache-first',
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
