"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_CANCELLED_ORDERS } from "@/graphql/operations/orders";
import { ISSUE_RECOVERY_PROMOTION } from "@/graphql/operations/promotions/mutations";
import { GET_RECOVERY_PROMOTIONS } from "@/graphql/operations/promotions/queries";
import { SEND_PUSH_NOTIFICATION } from "@/graphql/operations/notifications";
import { Package, Store, User, Hash, Copy, Check, Phone, HeartHandshake, X, CheckCircle2 } from "lucide-react";
import { GetCancelledOrdersQuery, GetRecoveryPromotionsQuery, PromotionType } from "@/gql/graphql";
import Link from "next/link";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

type CancelledOrder = GetCancelledOrdersQuery["cancelledOrders"][number];
type RecoveryPromotion = GetRecoveryPromotionsQuery["getRecoveryPromotions"][number];

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

interface RecoveryTarget {
    orderId: string;
    displayId: string;
    userId: string;
    userName: string;
    phoneNumber?: string | null;
}

export default function CancelledOrdersPage() {
    const { data, loading, error } = useQuery<GetCancelledOrdersQuery>(GET_CANCELLED_ORDERS, {
        fetchPolicy: "cache-and-network",
        pollInterval: 30000,
    });

    const { data: recoveryData, refetch: refetchRecovery } = useQuery<GetRecoveryPromotionsQuery>(GET_RECOVERY_PROMOTIONS, {
        fetchPolicy: "cache-and-network",
    });

    // Build a set of order identifiers that already have a recovery promotion:
    // - for new promos: keyed by order UUID (orderId)
    // - legacy fallback: extract displayId from promo name like "[Recovery] Order #GJ-XXXX ..."
    const compensatedOrderIds = useMemo<Set<string>>(() => {
        const promos: RecoveryPromotion[] = recoveryData?.getRecoveryPromotions ?? [];
        const ids = new Set<string>();
        for (const promo of promos) {
            if (promo.orderId) {
                ids.add(promo.orderId);
            } else {
                // Legacy: extract displayId from name e.g. "[Recovery] Order #GJ-Z5GU ..."
                const match = promo.name?.match(/Order #([A-Z0-9-]+)/);
                if (match) ids.add(`display:${match[1]}`);
            }
        }
        return ids;
    }, [recoveryData]);

    // Recovery modal state
    const [recoveryTarget, setRecoveryTarget] = useState<RecoveryTarget | null>(null);
    const [recoveryType, setRecoveryType] = useState<PromotionType>(PromotionType.FreeDelivery);
    const [recoveryAmount, setRecoveryAmount] = useState("");
    const [recoveryReason, setRecoveryReason] = useState("");
    const [recoverySent, setRecoverySent] = useState<"success" | "error" | null>(null);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [pushTitle, setPushTitle] = useState("");
    const [pushBody, setPushBody] = useState("");

    const [issueRecovery, { loading: issuing }] = useMutation(ISSUE_RECOVERY_PROMOTION);
    const [sendPush] = useMutation(SEND_PUSH_NOTIFICATION);

    const orders = useMemo<CancelledOrder[]>(() => {
        const raw = data?.cancelledOrders ?? [];
        return [...raw].sort(
            (a: CancelledOrder, b: CancelledOrder) =>
                new Date(b.cancelledAt ?? b.orderDate).getTime() -
                new Date(a.cancelledAt ?? a.orderDate).getTime()
        );
    }, [data]);

    const openRecovery = (order: CancelledOrder) => {
        if (!order.user) return;
        setRecoveryTarget({
            orderId: order.id,
            displayId: order.displayId,
            userId: order.user.id,
            userName: `${order.user.firstName} ${order.user.lastName}`,
            phoneNumber: order.user.phoneNumber,
        });
        setRecoveryType(PromotionType.FreeDelivery);
        setRecoveryAmount("");
        setRecoveryReason(order.cancellationReason ? `Order #${order.displayId} cancelled: ${order.cancellationReason}` : `Order #${order.displayId} was cancelled`);
        setPushEnabled(true);
        setPushTitle("We're sorry about your order 💙");
        setPushBody(`We've added a compensation to your account for order #${order.displayId}. It will apply automatically on your next order.`);
        setRecoverySent(null);
    };

    const handleIssueRecovery = async () => {
        if (!recoveryTarget || !recoveryReason.trim()) return;
        if (recoveryType !== "FREE_DELIVERY" && !recoveryAmount.trim()) return;
        try {
            await issueRecovery({
                variables: {
                    input: {
                        type: recoveryType,
                        discountValue: recoveryAmount.trim() ? Number(recoveryAmount) : undefined,
                        userIds: [recoveryTarget.userId],
                        orderId: recoveryTarget.orderId,
                        reason: recoveryReason.trim(),
                    },
                },
            });
            if (pushEnabled && pushTitle.trim() && pushBody.trim()) {
                await sendPush({
                    variables: {
                        input: {
                            userIds: [recoveryTarget.userId],
                            title: pushTitle.trim(),
                            body: pushBody.trim(),
                        },
                    },
                });
            }
            setRecoverySent("success");
            await refetchRecovery();
            setTimeout(() => { setRecoveryTarget(null); setRecoverySent(null); }, 1500);
        } catch {
            setRecoverySent("error");
        }
    };

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
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Compensate</th>
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

                                    {/* Compensate */}
                                    <td className="px-4 py-3">
                                        {order.user ? (
                                            compensatedOrderIds.has(order.id) || compensatedOrderIds.has(`display:${order.displayId}`) ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-800/50 bg-green-950/40 text-green-400 text-xs font-medium">
                                                    <CheckCircle2 size={13} />
                                                    Compensated
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openRecovery(order)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-800/50 bg-violet-950/40 text-violet-300 text-xs font-medium hover:bg-violet-900/50 hover:border-violet-700 transition-colors"
                                                >
                                                    <HeartHandshake size={13} />
                                                    Compensate
                                                </button>
                                            )
                                        ) : (
                                            <span className="text-zinc-700 text-sm">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Recovery modal ── */}
            {recoveryTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <HeartHandshake size={16} className="text-violet-400" />
                                <span className="font-semibold text-white text-sm">Issue Compensation</span>
                            </div>
                            <button onClick={() => setRecoveryTarget(null)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Who */}
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
                                <User size={13} className="text-zinc-500" />
                                <div>
                                    <span className="text-sm text-white font-medium">{recoveryTarget.userName}</span>
                                    <span className="text-xs text-zinc-500 ml-2">Order #{recoveryTarget.displayId}</span>
                                    {recoveryTarget.phoneNumber && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Phone size={10} className="text-zinc-600" />
                                            <span className="text-xs text-zinc-500">{recoveryTarget.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-2">Compensation type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { value: "FREE_DELIVERY", label: "Free Delivery" },
                                        { value: "FIXED_AMOUNT", label: "Fixed €" },
                                        { value: "PERCENTAGE", label: "% Off" },
                                    ] as const).map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setRecoveryType(opt.value as PromotionType)}
                                            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                                                recoveryType === opt.value
                                                    ? "border-violet-500 bg-violet-950 text-violet-300"
                                                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            {recoveryType !== "FREE_DELIVERY" && (
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-2">
                                        {recoveryType === "PERCENTAGE" ? "Discount (%)" : "Amount (€)"}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={recoveryType === "PERCENTAGE" ? "100" : undefined}
                                        step="0.5"
                                        value={recoveryAmount}
                                        onChange={(e) => setRecoveryAmount(e.target.value)}
                                        placeholder={recoveryType === "PERCENTAGE" ? "e.g., 10" : "e.g., 2.00"}
                                        className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                    />
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-2">Reason <span className="text-zinc-700">(internal note)</span></label>
                                <input
                                    type="text"
                                    value={recoveryReason}
                                    onChange={(e) => setRecoveryReason(e.target.value)}
                                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                />
                            </div>

                            {/* Push notification */}
                            <div className="border-t border-zinc-800 pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-zinc-400 font-medium">Send push notification</label>
                                    <button
                                        type="button"
                                        onClick={() => setPushEnabled((v) => !v)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${
                                            pushEnabled ? "bg-violet-600" : "bg-zinc-700"
                                        }`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                            pushEnabled ? "translate-x-5" : "translate-x-0.5"
                                        }`} />
                                    </button>
                                </div>
                                {pushEnabled && (
                                    <>
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1.5">Notification title</label>
                                            <input
                                                type="text"
                                                value={pushTitle}
                                                onChange={(e) => setPushTitle(e.target.value)}
                                                placeholder="We're sorry about your order 💙"
                                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1.5">Message</label>
                                            <textarea
                                                rows={2}
                                                value={pushBody}
                                                onChange={(e) => setPushBody(e.target.value)}
                                                placeholder="We've added a compensation to your account..."
                                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {recoverySent === "success" && (
                                <div className="flex items-center gap-2 bg-green-950 border border-green-900 rounded-lg px-3 py-2.5 text-green-300 text-sm">
                                    <CheckCircle2 size={14} />
                                    Compensation issued successfully!
                                </div>
                            )}
                            {recoverySent === "error" && (
                                <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5 text-red-300 text-sm">
                                    Failed to issue. Please try again.
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => setRecoveryTarget(null)}
                                className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-400 text-sm hover:text-white hover:border-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleIssueRecovery}
                                disabled={issuing || !recoveryReason.trim() || (recoveryType !== "FREE_DELIVERY" && !recoveryAmount.trim())}
                                className="flex-1 py-2 rounded-lg border border-violet-700 bg-violet-900/50 text-violet-200 text-sm font-medium hover:bg-violet-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <HeartHandshake size={14} />
                                {issuing ? "Issuing..." : "Issue Compensation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



