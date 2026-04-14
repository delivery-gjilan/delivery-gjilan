"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_STORE_STATUS, STORE_STATUS_UPDATED } from "@/graphql/operations/store";
import { GET_ORDERS } from "@/graphql/operations/orders";
import { useStoreStatusStore } from "@/store/storeStatusStore";
import { useTranslations } from "@/localization";
import { useAuth } from "@/lib/auth-context";

const ACTIVE_ORDER_STATUSES = new Set([
    "AWAITING_APPROVAL",
    "PENDING",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
]);

type StoreStatusPayload = {
    isStoreClosed?: boolean;
    closedMessage?: string | null;
    bannerEnabled?: boolean;
    bannerMessage?: string | null;
    bannerType?: string | null;
};

type GetStoreStatusQueryData = {
    getStoreStatus?: StoreStatusPayload | null;
};

type GetOrdersQueryData = {
    orders?: {
        orders?: Array<{ status?: string | null }> | null;
    } | null;
};

/**
 * Mount once in Providers — runs the query + subscription and syncs into
 * the Zustand store.
 */
export function StoreStatusInit() {
    const update = useStoreStatusStore((s) => s._update);
    const setLoading = useStoreStatusStore((s) => s._setLoading);

    const { data, loading, subscribeToMore } = useQuery<GetStoreStatusQueryData>(GET_STORE_STATUS, {
        fetchPolicy: "network-only",
    });

    useEffect(() => {
        setLoading(loading);
    }, [loading, setLoading]);

    useEffect(() => {
        if (data?.getStoreStatus) {
            update(data.getStoreStatus);
        }
    }, [data, update]);

    useEffect(() => {
        const unsubscribe = subscribeToMore({
            document: STORE_STATUS_UPDATED,
            updateQuery: (
                prev: { getStoreStatus?: { isStoreClosed: boolean; closedMessage: string | null } },
                { subscriptionData }: { subscriptionData: { data?: { storeStatusUpdated?: { isStoreClosed: boolean; closedMessage: string | null } } } }
            ) => {
                const next = subscriptionData.data?.storeStatusUpdated;
                if (!next) return prev;
                update(next);
                return { ...prev, getStoreStatus: next };
            },
        } as Parameters<typeof subscribeToMore>[0]);
        return unsubscribe;
    }, [subscribeToMore, update]);

    return null;
}

/**
 * Full-screen overlay shown when the store is closed AND the user opened
 * the site while it was already closed. Users already on the site are not blocked.
 */
export function StoreClosedOverlay() {
    const { isStoreClosed, closedMessage, wasOpenOnEntry, loading } =
        useStoreStatusStore();
    const { isAuthenticated } = useAuth();
    const { t } = useTranslations();

    const shouldCheckActiveOrders = isStoreClosed && !wasOpenOnEntry && isAuthenticated;
    const { data: ordersData, loading: ordersLoading } = useQuery<GetOrdersQueryData>(GET_ORDERS, {
        skip: !shouldCheckActiveOrders,
        fetchPolicy: "cache-and-network",
        variables: { limit: 20, offset: 0 },
    });

    const orders = ordersData?.orders?.orders ?? [];
    const hasActiveOrders = orders.some((order: { status?: string | null }) =>
        ACTIVE_ORDER_STATUSES.has(order?.status ?? ""),
    );

    if (loading || !isStoreClosed || wasOpenOnEntry) return null;
    if (shouldCheckActiveOrders && ordersLoading) return null;
    if (hasActiveOrders) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center px-6 max-w-md">
                <div className="bg-orange-500/20 p-6 rounded-full mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">
                    {t("store_closed.title")}
                </h1>
                <p className="text-muted-foreground text-base mb-6">
                    {closedMessage || t("store_closed.default_message")}
                </p>
                <div className="w-full bg-card/50 border border-border rounded-xl p-4">
                    <p className="text-muted-foreground text-sm">
                        {t("store_closed.info")}
                    </p>
                </div>
            </div>
        </div>
    );
}
