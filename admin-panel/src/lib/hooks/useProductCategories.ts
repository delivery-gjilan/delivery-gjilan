'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
    GET_CATEGORIES,
    CREATE_CATEGORY,
    UPDATE_CATEGORY,
    UPDATE_CATEGORIES_ORDER,
    DELETE_CATEGORY,
} from '@/graphql/operations/productCategories';
import type {
    CreateProductCategoryInput,
    CreateProductCategoryMutation,
    DeleteProductCategoryMutation,
    ProductCategoriesQuery,
    ProductCategoriesQueryVariables,
    UpdateProductCategoryInput,
    UpdateProductCategoryMutation,
    UpdateProductCategoriesOrderMutation,
    ProductCategoryOrderInput,
} from '@/gql/graphql';

export type CategoryListItem = ProductCategoriesQuery['productCategories'][number];

export interface UseCategoriesResult {
    categories: CategoryListItem[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseCreateCategoryResult {
    create: (input: CreateProductCategoryInput) => Promise<{
        success: boolean;
        data?: CreateProductCategoryMutation;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateCategoryResult {
    update: (id: string, input: UpdateProductCategoryInput) => Promise<{
        success: boolean;
        data?: UpdateProductCategoryMutation;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseDeleteCategoryResult {
    delete: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateCategoriesOrderResult {
    updateOrder: (businessId: string, categories: ProductCategoryOrderInput[]) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export function useCategories(businessId: string): UseCategoriesResult {
    const { data, loading, error, refetch } = useQuery<ProductCategoriesQuery, ProductCategoriesQueryVariables>(GET_CATEGORIES, {
        variables: { businessId },
        skip: !businessId,
    });

    return {
        categories: data?.productCategories || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useCreateCategory(): UseCreateCategoryResult {
    const [mutate, { loading, error }] = useMutation<CreateProductCategoryMutation>(CREATE_CATEGORY);

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

export function useUpdateCategory(): UseUpdateCategoryResult {
    const [mutate, { loading, error }] = useMutation<UpdateProductCategoryMutation>(UPDATE_CATEGORY);

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

export function useDeleteCategory(): UseDeleteCategoryResult {
    const [mutate, { loading, error }] = useMutation<DeleteProductCategoryMutation>(DELETE_CATEGORY);

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

export function useUpdateCategoriesOrder(): UseUpdateCategoriesOrderResult {
    const [mutate, { loading, error }] = useMutation<UpdateUpdateCategoriesOrderMutation>(UPDATE_CATEGORIES_ORDER);

    return {
        updateOrder: async (businessId, categories) => {
            try {
                await mutate({ variables: { businessId, categories } });
                return { success: true };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}
