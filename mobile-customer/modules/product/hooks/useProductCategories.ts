import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_CATEGORIES, GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS } from '@/graphql/operations/products';

export function useProductCategories(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCT_CATEGORIES, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'cache-first',
    });

    return {
        categories: data?.productCategories || [],
        loading,
        error,
        refetch,
    };
}

export function useProductSubcategoriesByBusiness(businessId: string) {
    const { data, loading, error, refetch } = useQuery(GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'cache-first',
    });

    return {
        subcategories: data?.productSubcategoriesByBusiness || [],
        loading,
        error,
        refetch,
    };
}
