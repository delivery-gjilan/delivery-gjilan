"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { GET_BUSINESSES, GET_BUSINESS } from "@/graphql/operations/businesses";

type BasicBusiness = { id: string; name: string };

export function useHydratedBusinesses() {
    const apollo = useApolloClient();
    const { data, loading, error } = useQuery(GET_BUSINESSES, {
        fetchPolicy: "cache-and-network",
    });

    const basics = useMemo<BasicBusiness[]>(() => {
        const raw = (data as any)?.businesses;
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    const [detailsById, setDetailsById] = useState<Record<string, any>>({});
    const [hydrating, setHydrating] = useState(false);
    const hydratedKeyRef = useRef<string>("");
    const detailsByIdRef = useRef<Record<string, any>>({});

    useEffect(() => {
        detailsByIdRef.current = detailsById;
    });

    useEffect(() => {
        const ids = basics.map((b) => b.id).filter(Boolean);
        const key = ids.join(",");

        if (!key) {
            if (hydratedKeyRef.current !== "") {
                setDetailsById({});
                hydratedKeyRef.current = "";
            }
            return;
        }

        const missingIds = ids.filter((id) => !detailsByIdRef.current[id]);
        if (hydratedKeyRef.current === key && missingIds.length === 0) return;
        hydratedKeyRef.current = key;

        let active = true;
        setHydrating(true);

        Promise.allSettled(
            missingIds.map((id) =>
                apollo.query({
                    query: GET_BUSINESS,
                    variables: { id },
                    fetchPolicy: "network-only",
                })
            )
        )
            .then((results) => {
                if (!active) return;
                setDetailsById((prev) => {
                    const next = { ...prev };
                    for (const r of results) {
                        if (r.status !== "fulfilled") continue;
                        const full = (r as PromiseFulfilledResult<any>).value?.data?.business;
                        if (full?.id) next[full.id] = full;
                    }
                    return next;
                });
            })
            .finally(() => {
                if (active) setHydrating(false);
            });

        return () => {
            active = false;
        };
    }, [apollo, basics]);

    const businesses = useMemo(
        () => basics.map((b) => detailsById[b.id] ?? b),
        [basics, detailsById]
    );

    return {
        businesses,
        loading: loading && basics.length === 0,
        hydrating,
        error,
    };
}
