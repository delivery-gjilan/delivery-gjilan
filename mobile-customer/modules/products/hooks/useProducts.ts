import { useQuery } from '@apollo/client/react';
import { GET_PRODUCTS, GET_PRODUCT } from '@/graphql/operations/products';

export function useProducts(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
        variables: { businessId },
        skip: !businessId,
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
    });

    return {
        product: data?.product || null,
        loading,
        error,
        refetch,
    };
}
