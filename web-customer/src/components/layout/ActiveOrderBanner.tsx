"use client";

import { useQuery, useSubscription } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { GET_ORDERS, USER_ORDERS_UPDATED } from "@/graphql/operations/orders";
import { Package, ChevronRight, Clock, Bike, UtensilsCrossed, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
const ActiveOrderModal = dynamic(
    () => import("@/components/orders/ActiveOrderModal").then((m) => ({ default: m.ActiveOrderModal })),
    { ssr: false }
);
import { useOrderModalsStore } from "@/store/orderModalsStore";

const ACTIVE_STATUSES = ["AWAITING_APPROVAL", "PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
    AWAITING_APPROVAL: { label: "Awaiting approval", color: "bg-amber-500", icon: ShieldCheck },
    PENDING: { label: "Waiting for confirmation", color: "bg-amber-500", icon: Clock },
    PREPARING: { label: "Being prepared", color: "bg-orange-500", icon: UtensilsCrossed },
    READY: { label: "Ready for pickup", color: "bg-blue-500", icon: Package },
    OUT_FOR_DELIVERY: { label: "On the way", color: "bg-emerald-500", icon: Bike },
};

const HIDDEN_ON = ["/orders", "/checkout", "/login", "/signup", "/profile"];

type UserOrdersUpdatedSubscriptionData = {
    userOrdersUpdated?: any[] | null;
};

function extractOrders(data: any): any[] {
    const payload = data?.orders;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.orders)) return payload.orders;
    return [];
}

export function ActiveOrderBanner() {
    const { isAuthenticated } = useAuth();
    const { t } = useTranslations();
    const pathname = usePathname();
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const { showOrderDelivered, showAwaitingApproval } = useOrderModalsStore();
    const isFirstLoadRef = useRef(true);
    // Track previous order IDs to detect delivered transitions
    const prevOrderIdsRef = useRef<Set<string>>(new Set());
    // Track which awaiting-approval orders we've already prompted for
    const promptedAwaitingRef = useRef<Set<string>>(new Set());

    const isHiddenPage = HIDDEN_ON.some((p) => pathname.startsWith(p));

    const { data: queryData } = useQuery(GET_ORDERS, {
        skip: !isAuthenticated || isHiddenPage,
        fetchPolicy: "cache-and-network",
        pollInterval: 60_000,
        variables: { limit: 20, offset: 0 },
    });

    const { data: subData } = useSubscription<UserOrdersUpdatedSubscriptionData>(USER_ORDERS_UPDATED, {
        skip: !isAuthenticated || isHiddenPage,
    });

    useEffect(() => {
        const subOrders: any[] | null = Array.isArray(subData?.userOrdersUpdated)
            ? subData.userOrdersUpdated
            : null;
        const source = subOrders ?? extractOrders(queryData);
        const active = source.filter((o: any) => ACTIVE_STATUSES.includes(o?.status));

        // Detect orders that transitioned to DELIVERED (were active, now gone or delivered)
        // Skip on first load to avoid triggering for historical orders already delivered
        if (!isFirstLoadRef.current && source.length > 0) {
            prevOrderIdsRef.current.forEach((prevId) => {
                const found = source.find((o: any) => o.id === prevId);
                if (found?.status === "DELIVERED") {
                    showOrderDelivered(prevId);
                }
            });
        }
        isFirstLoadRef.current = false;

        // Detect new AWAITING_APPROVAL orders and show modal for them
        active.forEach((o: any) => {
            if (o.status === "AWAITING_APPROVAL" && !promptedAwaitingRef.current.has(o.id)) {
                promptedAwaitingRef.current.add(o.id);
                const reasons: string[] = Array.isArray(o.approvalReasons) ? o.approvalReasons : [];
                showAwaitingApproval(o.id, reasons);
            }
        });

        // Update previous active IDs
        prevOrderIdsRef.current = new Set(active.map((o: any) => o.id));

        setActiveOrders((prev) => {
            if (prev.length === active.length && prev[0]?.id === active[0]?.id && prev[0]?.status === active[0]?.status) {
                return prev;
            }
            return active;
        });
    }, [queryData, subData, showOrderDelivered, showAwaitingApproval]);

    const openModal = useCallback(() => {
        const order = activeOrders[0];
        if (order?.status === "AWAITING_APPROVAL") {
            const reasons: string[] = Array.isArray(order.approvalReasons) ? order.approvalReasons : [];
            showAwaitingApproval(order.id, reasons);
        } else {
            setModalOpen(true);
        }
    }, [activeOrders, showAwaitingApproval]);
    const closeModal = useCallback(() => setModalOpen(false), []);

    // Close modal when order completes
    useEffect(() => {
        if (activeOrders.length === 0 && modalOpen) setModalOpen(false);
    }, [activeOrders.length, modalOpen]);

    if (!isAuthenticated) return null;
    if (isHiddenPage) return null;
    if (!activeOrders.length) return null;

    const order = activeOrders[0];
    const config = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-[var(--primary)]", icon: Package };
    const StatusIcon = config.icon;
    const businessName = order.businesses?.[0]?.business?.name ?? "";

    return (
        <>
            {/* Floating pill — stacks above cart bar */}
            <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
                <button
                    onClick={openModal}
                    className={`relative w-full flex items-center justify-between gap-3 rounded-2xl ${config.color} px-5 py-4 text-white shadow-2xl hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer`}
                >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                            <StatusIcon size={22} />
                        </div>
                        <div className="min-w-0 text-left">
                            <p className="text-xs text-white/70 font-medium truncate">
                                #{order.displayId ?? order.id?.slice(0, 8)}
                                {businessName ? ` · ${businessName}` : ""}
                            </p>
                            <p className="text-sm font-bold leading-tight">{config.label}</p>
                        </div>
                    </div>

                    {/* Right: ETA + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                        {order.preparationMinutes && (
                            <span className="flex items-center gap-1 text-xs text-white/80">
                                <Clock size={13} />
                                {order.preparationMinutes} {t("common.min")}
                            </span>
                        )}
                        <ChevronRight size={18} className="opacity-70" />
                    </div>
                </button>
            </div>

            {/* Full-screen modal */}
            {modalOpen && (
                <ActiveOrderModal orderId={order.id} onClose={closeModal} />
            )}
        </>
    );
}
