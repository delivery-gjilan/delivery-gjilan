"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";

export function useHydratedBusinesses() {
    const { data, loading, error } = useQuery(GET_BUSINESSES, {
        fetchPolicy: "cache-and-network",
    });

    const businesses = useMemo<any[]>(() => {
        const raw = (data as any)?.businesses;
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    return {
        businesses,
        loading: loading && businesses.length === 0,
        hydrating: false,
        error,
    };
}
