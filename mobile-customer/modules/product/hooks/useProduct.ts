import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT } from '@/graphql/operations/products';

export function useProduct(productId: string) {
    const { data, loading, error } = useQuery(GET_PRODUCT, {
        variables: { id: productId },
        skip: !productId,
    });

    return {
        product: data?.product,
        loading,
        error,
    };
}
