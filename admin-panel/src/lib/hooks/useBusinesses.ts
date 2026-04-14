'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
    GET_BUSINESS,
    GET_BUSINESSES,
    CREATE_BUSINESS,
    UPDATE_BUSINESS,
    DELETE_BUSINESS,
} from '@/graphql/operations/businesses';
import type {
    BusinessesQuery,
    BusinessQuery,
    CreateBusinessInput,
    CreateBusinessMutation,
    UpdateBusinessInput,
    UpdateBusinessMutation,
} from '@/gql/graphql';

type BusinessList = BusinessesQuery['businesses'];
type BusinessItem = BusinessList[number];

export interface UseBusinessesResult {
    businesses: BusinessList;
    loading: boolean;
    error?: string;
    refetch: () => void;
}

export interface UseBusinessResult {
    business: BusinessQuery['business'];
    loading: boolean;
    error?: string;
}

export interface UseCreateBusinessResult {
    create: (input: CreateBusinessInput) => Promise<{
        success: boolean;
        data?: CreateBusinessMutation | null;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseUpdateBusinessResult {
    update: (id: string, input: UpdateBusinessInput) => Promise<{
        success: boolean;
        data?: UpdateBusinessMutation | null;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export interface UseDeleteBusinessResult {
    delete: (id: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error?: string;
}

export function useBusinesses(): UseBusinessesResult {
    const { data, loading, error, refetch } = useQuery(GET_BUSINESSES);

    return {
        businesses: data?.businesses || [],
        loading,
        error: error?.message,
        refetch: () => refetch(),
    };
}

export function useBusiness(id: string): UseBusinessResult {
    const { data, loading, error } = useQuery(GET_BUSINESS, {
        variables: { id },
        skip: !id,
    });

    return {
        business: data?.business || null,
        loading,
        error: error?.message,
    };
}

export function useCreateBusiness(): UseCreateBusinessResult {
    const [mutate, { loading, error }] = useMutation(CREATE_BUSINESS, {
        refetchQueries: [{ query: GET_BUSINESSES }],
        awaitRefetchQueries: true,
    });

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

export function useUpdateBusiness(): UseUpdateBusinessResult {
    const [mutate, { loading, error }] = useMutation(UPDATE_BUSINESS, {
        refetchQueries: [{ query: GET_BUSINESSES }],
        awaitRefetchQueries: true,
    });

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

export function useDeleteBusiness(): UseDeleteBusinessResult {
    const [mutate, { loading, error }] = useMutation(DELETE_BUSINESS, {
        refetchQueries: [{ query: GET_BUSINESSES }],
        awaitRefetchQueries: true,
    });

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
