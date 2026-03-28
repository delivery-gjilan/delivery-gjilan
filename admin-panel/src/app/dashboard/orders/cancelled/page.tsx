"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_CANCELLED_ORDERS } from "@/graphql/operations/orders";
import { Package, Store, User, MapPin, Hash, Copy, Check, Phone } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice?: number;
}

interface OrderBusiness {
    business: {
        id: string;
        name: string;
        businessType: string;
    };
    items: OrderItem[];
}

interface Location {
    latitude: number;
    longitude: number;
    address: string;
}

interface CancelledOrder {
    id: string;
    displayId: string;
    orderPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    orderDate: string;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string | null;
    } | null;
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    businesses: OrderBusiness[];
    dropOffLocation: Location;
    adminNote?: string | null;
}

function parseAdminNote(adminNote?: string | null): { tag: string; note: string } | null {
    if (!adminNote) return null;
    try {
        const p = JSON.parse(adminNote);
        if (p && typeof p === 'object' && (p.tag || p.note)) return { tag: p.tag || '', note: p.note || '' };
    } catch {}
    return null;
}

const INCIDENT_TAG_LABELS: Record<string, string> = {
    late_prep: 'Late Prep',
    driver_delay: 'Driver Delay',
    handoff_issue: 'Handoff Issue',
    customer_issue: 'Customer Issue',
    wrong_order: 'Wrong Order',
    other: 'Other',
};

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function CopyableId({ displayId }: { displayId: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(displayId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-300 hover:text-white transition-colors group"
            title="Copy order ID"
        >
            <Hash size={12} className="text-zinc-600" />
            {displayId}
            {copied ? (
                <Check size={12} className="text-green-400" />
            ) : (
                <Copy size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function CancelledOrdersPage() {
    const { data, loading, error } = useQuery(GET_CANCELLED_ORDERS, {
        fetchPolicy: "cache-and-network",
        pollInterval: 30000,
    });

    const orders = useMemo<CancelledOrder[]>(() => {
        const raw = (data as any)?.cancelledOrders ?? [];
        return [...raw].sort(
            (a: CancelledOrder, b: CancelledOrder) =>
                new Date(b.cancelledAt ?? b.orderDate).getTime() -
                new Date(a.cancelledAt ?? a.orderDate).getTime()
        );
    }, [data]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-zinc-500">
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
                    Loading cancelled orders...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 text-sm py-8 text-center">
                Failed to load cancelled orders: {error.message}
            </div>
        );
    }

    return (
        <div className="text-white max-w-[1600px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-white">Cancelled Orders</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">{orders.length} total cancelled orders</p>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    ← Back to Orders
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="text-center text-zinc-600 py-20">
                    No cancelled orders yet.
                </div>
            ) : (
                <div className="overflow-hidden border border-zinc-800 rounded-xl">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#09090b] border-b border-zinc-800">
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Order</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Businesses</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Driver</th>
                                <th className="px-4 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Cancelled At</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Incident</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                                    {/* Order ID + date */}
                                    <td className="px-4 py-3">
                                        <CopyableId displayId={order.displayId} />
                                        <div className="text-[11px] text-zinc-600 mt-1">
                                            {new Date(order.orderDate).toLocaleDateString()}
                                        </div>
                                    </td>

                                    {/* Customer */}
                                    <td className="px-4 py-3">
                                        {order.user ? (
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <User size={13} className="text-zinc-500 flex-shrink-0" />
                                                    <span className="text-sm text-white">
                                                        {order.user.firstName} {order.user.lastName}
                                                    </span>
                                                </div>
                                                {order.user.phoneNumber && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 ml-5">
                                                        <Phone size={11} className="text-zinc-600" />
                                                        <span className="text-xs text-zinc-500">{order.user.phoneNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600 text-sm">—</span>
                                        )}
                                    </td>

                                    {/* Businesses */}
                                    <td className="px-4 py-3">
                                        <div className="space-y-0.5">
                                            {(order.businesses ?? []).map((biz, i) => (
                                                <div key={i} className="flex items-center gap-1.5">
                                                    <Store size={13} className="text-violet-500 flex-shrink-0" />
                                                    <span className="text-sm text-zinc-300">{biz.business.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Driver */}
                                    <td className="px-4 py-3">
                                        {order.driver ? (
                                            <div className="flex items-center gap-1.5">
                                                <Package size={13} className="text-zinc-500" />
                                                <span className="text-sm text-zinc-300">
                                                    {order.driver.firstName} {order.driver.lastName}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600 text-sm">Unassigned</span>
                                        )}
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-semibold text-white">${Number(order.totalPrice).toFixed(2)}</span>
                                    </td>

                                    {/* Cancelled at */}
                                    <td className="px-4 py-3">
                                        {order.cancelledAt ? (
                                            <div className="text-sm text-red-300">
                                                {new Date(order.cancelledAt).toLocaleString([], {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600 text-sm">—</span>
                                        )}
                                    </td>

                                    {/* Reason */}
                                    <td className="px-4 py-3 max-w-xs">
                                        {order.cancellationReason ? (
                                            <span className="text-sm text-zinc-400 line-clamp-2" title={order.cancellationReason}>
                                                {order.cancellationReason}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600 text-sm">—</span>
                                        )}
                                    </td>

                                    {/* Incident */}
                                    <td className="px-4 py-3 max-w-[160px]">
                                        {(() => {
                                            const inc = parseAdminNote(order.adminNote);
                                            if (!inc) return <span className="text-zinc-700 text-sm">—</span>;
                                            return (
                                                <div className="space-y-0.5">
                                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase tracking-wide">
                                                        {INCIDENT_TAG_LABELS[inc.tag] ?? inc.tag}
                                                    </span>
                                                    {inc.note && (
                                                        <div className="text-xs text-zinc-400 line-clamp-2" title={inc.note}>{inc.note}</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
