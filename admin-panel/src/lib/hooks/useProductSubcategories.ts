'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
    GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS,
    CREATE_PRODUCT_SUBCATEGORY,
    UPDATE_PRODUCT_SUBCATEGORY,
    DELETE_PRODUCT_SUBCATEGORY,
} from '@/graphql/operations/productSubcategories';
import type {
    CreateProductSubcategoryInput,
    CreateProductSubcategoryMutation,
    DeleteProductSubcategoryMutation,
    ProductSubcategoriesByBusinessQuery,
    ProductSubcategoriesByBusinessQueryVariables,
    UpdateProductSubcategoryInput,
    UpdateProductSubcategoryMutation,
} from '@/gql/graphql';

export type SubcategoryListItem = ProductSubcategoriesByBusinessQuery['productSubcategoriesByBusiness'][number];

export interface UseProductSubcategoriesResult {
    subcategories: SubcategoryListItem[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseCreateProductSubcategoryResult {
    create: (input: CreateProductSubcategoryInput) => Promise<{
        success: boolean;
        data?: CreateProductSubcategoryMutation | null;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateProductSubcategoryResult {
    update: (id: string, input: UpdateProductSubcategoryInput) => Promise<{
        success: boolean;
        data?: UpdateProductSubcategoryMutation | null;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseDeleteProductSubcategoryResult {
    delete: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export function useProductSubcategories(businessId: string): UseProductSubcategoriesResult {
    const { data, loading, error, refetch } = useQuery<ProductSubcategoriesByBusinessQuery, ProductSubcategoriesByBusinessQueryVariables>(GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS, {
        variables: { businessId },
        skip: !businessId,
    });

    return {
        subcategories: data?.productSubcategoriesByBusiness || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useCreateProductSubcategory(): UseCreateProductSubcategoryResult {
    const [mutate, { loading, error }] = useMutation<CreateProductSubcategoryMutation>(CREATE_PRODUCT_SUBCATEGORY);

    return {
        create: async (input) => {
            try {
                const result = await mutate({ variables: { input } });
                return { success: true, data: result.data };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}

export function useUpdateProductSubcategory(): UseUpdateProductSubcategoryResult {
    const [mutate, { loading, error }] = useMutation<UpdateProductSubcategoryMutation>(UPDATE_PRODUCT_SUBCATEGORY);

    return {
        update: async (id, input) => {
            try {
                const result = await mutate({ variables: { id, input } });
                return { success: true, data: result.data };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}

export function useDeleteProductSubcategory(): UseDeleteProductSubcategoryResult {
    const [mutate, { loading, error }] = useMutation<DeleteProductSubcategoryMutation>(DELETE_PRODUCT_SUBCATEGORY);

    return {
        delete: async (id) => {
            try {
                await mutate({ variables: { id } });
                return { success: true };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}
