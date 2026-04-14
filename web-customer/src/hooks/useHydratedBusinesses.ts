"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import type { GqlBusiness } from "@/types/graphql";

export function useHydratedBusinesses() {
    const { data, loading, error } = useQuery(GET_BUSINESSES, {
        fetchPolicy: "cache-and-network",
    });

    const businesses = useMemo<GqlBusiness[]>(() => {
        const raw = (data as { businesses?: GqlBusiness[] } | undefined)?.businesses;
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    return {
        businesses,
        loading: loading && businesses.length === 0,
        hydrating: false,
        error,
    };
}
