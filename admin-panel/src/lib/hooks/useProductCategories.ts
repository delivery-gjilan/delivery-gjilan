'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
    GET_CATEGORIES,
    CREATE_CATEGORY,
    UPDATE_CATEGORY,
    DELETE_CATEGORY,
} from '@/graphql/operations/productCategories';
import type { CreateProductCategoryInput, UpdateProductCategoryInput } from '@/gql/graphql';

export interface UseCategoriesResult {
    categories: any[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseCreateCategoryResult {
    create: (input: CreateProductCategoryInput) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateCategoryResult {
    update: (id: string, input: UpdateProductCategoryInput) => Promise<{
        success: boolean;
        data?: any;
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

export function useCategories(businessId: string): UseCategoriesResult {
    const { data, loading, error, refetch } = useQuery(GET_CATEGORIES, {
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
    const [mutate, { loading, error }] = useMutation(CREATE_CATEGORY);

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
    const [mutate, { loading, error }] = useMutation(UPDATE_CATEGORY);

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
    const [mutate, { loading, error }] = useMutation(DELETE_CATEGORY);

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
