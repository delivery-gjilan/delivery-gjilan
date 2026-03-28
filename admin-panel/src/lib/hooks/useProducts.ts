'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
    GET_BUSINESS_PRODUCTS_AND_CATEGORIES,
    CREATE_PRODUCT,
    UPDATE_PRODUCT,
    DELETE_PRODUCT,
    UPDATE_PRODUCTS_ORDER,
    CREATE_PRODUCT_VARIANT_GROUP,
    DELETE_PRODUCT_VARIANT_GROUP,
} from '@/graphql/operations/products';
import type { CreateProductInput, UpdateProductInput } from '@/gql/graphql';

export interface UseProductsResult {
    products: any[];
    categories: any[];
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseCreateProductResult {
    create: (input: CreateProductInput) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateProductResult {
    update: (id: string, input: UpdateProductInput) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseDeleteProductResult {
    delete: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateProductsOrderResult {
    updateOrder: (businessId: string, products: { id: string; sortOrder: number }[]) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseCreateProductVariantGroupResult {
    createVariantGroup: (input: { businessId: string; name: string }) => Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseDeleteProductVariantGroupResult {
    deleteVariantGroup: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export function useProducts(businessId: string): UseProductsResult {
    const { data, loading, error, refetch } = useQuery(GET_BUSINESS_PRODUCTS_AND_CATEGORIES, {
        variables: { businessId },
        skip: !businessId,
    });

    const products = (data?.products || [])
        .map((card: any) => {
            const product = card?.product;
            return {
                id: product?.id ?? card?.id,
                businessId: product?.businessId ?? businessId,
                categoryId: product?.categoryId ?? '',
                subcategoryId: product?.subcategoryId ?? null,
                variantGroupId: product?.variantGroupId ?? null,
                variantGroupName: product?.variantGroup?.name ?? null,
                name: product?.name ?? card?.name,
                description: product?.description ?? null,
                imageUrl: product?.imageUrl ?? card?.imageUrl ?? null,
                price: product?.price ?? card?.basePrice ?? 0,
                isOffer: card?.isOffer ?? false,
                isOnSale: product?.isOnSale ?? false,
                salePrice: product?.salePrice ?? null,
                isAvailable: product?.isAvailable ?? true,
                sortOrder: product?.sortOrder ?? 0,
            };
        })
        .filter((p: any) => Boolean(p.categoryId));

    return {
        products,
        categories: data?.productCategories || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useCreateProduct(): UseCreateProductResult {
    const [mutate, { loading, error }] = useMutation(CREATE_PRODUCT);

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

export function useUpdateProduct(): UseUpdateProductResult {
    const [mutate, { loading, error }] = useMutation(UPDATE_PRODUCT);

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

export function useDeleteProduct(): UseDeleteProductResult {
    const [mutate, { loading, error }] = useMutation(DELETE_PRODUCT);

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

export function useUpdateProductsOrder(): UseUpdateProductsOrderResult {
    const [mutate, { loading, error }] = useMutation(UPDATE_PRODUCTS_ORDER);

    return {
        updateOrder: async (businessId, products) => {
            try {
                await mutate({ variables: { businessId, products } });
                return { success: true };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}

export function useCreateProductVariantGroup(): UseCreateProductVariantGroupResult {
    const [mutate, { loading, error }] = useMutation(CREATE_PRODUCT_VARIANT_GROUP);

    return {
        createVariantGroup: async (input) => {
            try {
                const result = await mutate({ variables: { input } });
                return { success: true, data: result.data?.createProductVariantGroup };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
        loading,
        error: error?.message,
    };
}

export function useDeleteProductVariantGroup(): UseDeleteProductVariantGroupResult {
    const [mutate, { loading, error }] = useMutation(DELETE_PRODUCT_VARIANT_GROUP);

    return {
        deleteVariantGroup: async (id) => {
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
