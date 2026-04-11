"use client";

import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { GET_ORDERS } from "@/graphql/operations/orders";
import { Package, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";

const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
    PENDING: "warning",
    PREPARING: "warning",
    READY_FOR_PICKUP: "default",
    PICKED_UP: "default",
    ON_THE_WAY: "default",
    DELIVERED: "success",
    CANCELLED: "danger",
};

export default function OrdersPage() {
    const { user } = useAuth();
    const { t } = useTranslations();
    const [tab, setTab] = useState<"active" | "history">("active");

    const { data, loading } = useQuery(GET_ORDERS, {
        skip: !user,
        fetchPolicy: "cache-and-network",
    });

    const ordersPayload = (data as any)?.orders;
    const orders = Array.isArray(ordersPayload)
        ? ordersPayload
        : Array.isArray(ordersPayload?.orders)
        ? ordersPayload.orders
        : [];
    const activeStatuses = ["PENDING", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY"];
    const activeOrders = orders.filter((o: any) => activeStatuses.includes(o.status));
    const historyOrders = orders.filter((o: any) => !activeStatuses.includes(o.status));

    const displayOrders = tab === "active" ? activeOrders : historyOrders;

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <p className="text-[var(--foreground-secondary)]">{t("auth.login_required")}</p>
                <Link href="/login">
                    <Button>{t("auth.login")}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("orders.title")}</h1>

            {/* Tabs */}
            <div className="flex gap-1 rounded-[var(--radius)] bg-[var(--background-secondary)] p-1">
                {(["active", "history"] as const).map((t_) => (
                    <button
                        key={t_}
                        onClick={() => setTab(t_)}
                        className={cn(
                            "flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                            tab === t_
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                    >
                        {t_ === "active" ? t("orders.active") : t("orders.history")}
                        {t_ === "active" && activeOrders.length > 0 && (
                            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                                {activeOrders.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-[var(--radius)]" />
                    ))}
                </div>
            ) : displayOrders.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                    <Package size={40} className="mx-auto text-[var(--muted)]" />
                    <p className="text-sm text-[var(--foreground-secondary)]">
                        {tab === "active" ? t("orders.no_active") : t("orders.no_history")}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayOrders.map((order: any) => (
                        <Link
                            key={order.id}
                            href={`/orders/${order.id}`}
                            className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--primary)]/50 transition-colors"
                        >
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                        #{order.orderNumber ?? order.id.slice(-6)}
                                    </span>
                                    <Badge variant={statusColors[order.status] ?? "default"}>
                                        {order.status?.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {formatDate(order.orderDate ?? order.createdAt ?? order.updatedAt)}
                                    </span>
                                    <span>
                                        {Array.isArray(order.businesses)
                                            ? order.businesses.reduce(
                                                  (sum: number, b: any) => sum + (Array.isArray(b?.items) ? b.items.length : 0),
                                                  0
                                              )
                                            : 0}{" "}
                                        {t("orders.items")}
                                    </span>
                                </div>
                                <span className="text-sm font-bold">{formatPrice(order.totalPrice)}</span>
                            </div>
                            <ChevronRight size={16} className="text-[var(--muted)]" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
