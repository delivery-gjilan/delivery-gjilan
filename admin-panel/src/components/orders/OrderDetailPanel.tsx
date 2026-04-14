"use client";

import { useState, useMemo } from "react";
import { Check, Copy, Hash, Calendar, Clock, User, Truck, MapPin, MessageSquare, Phone, Package, CreditCard, Tag, Store, X, Timer } from "lucide-react";
import Button from "@/components/ui/Button";
import { getMarginSeverity } from "@/lib/constants/orderHelpers";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    isTrustedCustomer,
    isApprovalModalSuppressed,
    deriveApprovalReasons,
    parseAdminNote,
    getBusinessItemsSafe,
    getOrderBusinessesSafe,
    roundMoney,
} from "./helpers";
import type { Order, OrderStatus } from "./types";

/* ----- Helper sub-components ----- */

function StatusBadge({ status }: { status: OrderStatus }) {
    const colors = STATUS_COLORS[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {STATUS_LABELS[status]}
        </span>
    );
}

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
            className="inline-flex items-center gap-1.5 font-mono text-lg font-bold text-white hover:text-zinc-200 transition-colors group"
        >
            <Hash size={14} className="text-zinc-600" />
            {displayId}
            {copied ? (
                <Check size={13} className="text-green-400" />
            ) : (
                <Copy size={13} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
}

/* ----- Props ----- */

export interface OrderDetailPanelProps {
    order: Order;
    isBusinessUser: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    coverageData: any;
    coverageLoading: boolean;
    deductingStock: boolean;
    grantingFreeDelivery: boolean;
    trustUpdatingUserId: string | null;
    suppressionUpdatingUserId: string | null;
    approvingOrder: boolean;
    now: number;
    onClose: () => void;
    onRemoveItem: (dialog: { orderId: string; itemId: string; itemName: string; itemQuantity: number }) => void;
    onDeductStock: () => void;
    onGrantFreeDelivery: () => void;
    onToggleTrustedCustomer: (user: NonNullable<Order["user"]>, trust: boolean) => void;
    onOpenApprovalModal: () => void;
    onSetApprovalModalSuppression: (user: NonNullable<Order["user"]>, suppress: boolean) => void;
    onEditPrepTime: (order: Order) => void;
}

export default function OrderDetailPanel({
    order,
    isBusinessUser,
    isAdmin,
    coverageData,
    coverageLoading,
    deductingStock,
    grantingFreeDelivery,
    trustUpdatingUserId,
    suppressionUpdatingUserId,
    approvingOrder,
    onClose,
    onRemoveItem,
    onDeductStock,
    onGrantFreeDelivery,
    onToggleTrustedCustomer,
    onOpenApprovalModal,
    onSetApprovalModalSuppression,
    onEditPrepTime,
}: OrderDetailPanelProps) {
    const isCompleted = order.status === "DELIVERED" || order.status === "CANCELLED";
    const businessList = getOrderBusinessesSafe(order);
    const totalItems = businessList.reduce(
        (s, biz) => s + getBusinessItemsSafe(biz).reduce((ss, item) => ss + (item.quantity || 1), 0),
        0
    );
    const preview = !isBusinessUser ? (order as any).settlementPreview : null;

    const orderTotals = useMemo(() => {
        const itemsSubtotal = Number(order.originalPrice ?? order.orderPrice ?? 0);
        const itemsDiscount = roundMoney(Math.max(0, itemsSubtotal - Number(order.orderPrice ?? 0)));
        const deliveryBase = Number(order.originalDeliveryPrice ?? order.deliveryPrice ?? 0);
        const deliveryDiscount = roundMoney(Math.max(0, deliveryBase - Number(order.deliveryPrice ?? 0)));
        return { itemsSubtotal, itemsDiscount, deliveryBase, deliveryDiscount };
    }, [order]);

    const promoSummary = useMemo(() => {
        const promotions = order.orderPromotions ?? [];
        if (!promotions.length) return { totalCount: 0, deliveryCount: 0, orderCount: 0, totalSavings: 0 };
        const deliveryCount = promotions.filter((p) => p.appliesTo === "DELIVERY").length;
        const orderCount = promotions.length - deliveryCount;
        const totalSavings = roundMoney(promotions.reduce((s, p) => s + Number(p.discountAmount || 0), 0));
        return { totalCount: promotions.length, deliveryCount, orderCount, totalSavings };
    }, [order]);

    const approvalReasons = deriveApprovalReasons(order);

    return (
        <div className="flex flex-col h-full bg-[#0d0d10] border-l border-zinc-800">
            {/* Panel header */}
            <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-zinc-800 shrink-0">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <CopyableId displayId={order.displayId} />
                        <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(order.orderDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(order.orderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors mt-0.5"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {/* Customer + Driver */}
                <div className="grid grid-cols-2 gap-3">
                    {order.user && (
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={13} className="text-zinc-500" />
                                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Customer</span>
                            </div>
                            <div className="text-white text-sm font-medium">{order.user.firstName} {order.user.lastName}</div>
                            <div className="text-zinc-500 text-xs mt-0.5">{order.user.email}</div>
                            {typeof order.user.totalOrders === "number" && (
                                <div className="text-zinc-500 text-xs mt-0.5">{order.user.totalOrders} total orders</div>
                            )}
                            {order.user.phoneNumber && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Phone size={11} className="text-zinc-600" />
                                    <a href={`tel:${order.user.phoneNumber}`} className="text-zinc-400 text-xs hover:text-white transition-colors">
                                        {order.user.phoneNumber}
                                    </a>
                                </div>
                            )}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {isTrustedCustomer(order.user) && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                        Trusted
                                    </span>
                                )}
                                {isAdmin && (
                                    <button
                                        type="button"
                                        disabled={trustUpdatingUserId === order.user.id}
                                        onClick={() => onToggleTrustedCustomer(order.user!, !isTrustedCustomer(order.user))}
                                        className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {trustUpdatingUserId === order.user.id ? "Saving..." : isTrustedCustomer(order.user) ? "Untrust" : "Mark trusted"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Truck size={13} className="text-zinc-500" />
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Driver</span>
                        </div>
                        {order.driver ? (
                            <>
                                <div className="text-white text-sm font-medium">{order.driver.firstName} {order.driver.lastName}</div>
                                <div className="text-zinc-500 text-xs mt-0.5">{order.driver.email}</div>
                            </>
                        ) : (
                            <div className="text-zinc-600 text-sm">Not assigned</div>
                        )}
                    </div>
                </div>

                {/* Cancellation info */}
                {order.status === "CANCELLED" && (order.cancellationReason || order.cancelledAt) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1.5 font-semibold">Cancellation</div>
                        {order.cancelledAt && (
                            <div className="text-xs text-zinc-500 mb-1">{new Date(order.cancelledAt).toLocaleString()}</div>
                        )}
                        {order.cancellationReason && (
                            <div className="text-sm text-red-200">{order.cancellationReason}</div>
                        )}
                    </div>
                )}

                {/* Delivery address */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <MapPin size={13} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Delivery Address</span>
                    </div>
                    <span className="text-white text-sm">{order.dropOffLocation.address}</span>
                </div>

                {/* Driver notes */}
                {order.driverNotes && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <MessageSquare size={13} className="text-blue-400" />
                            <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Delivery Instructions</span>
                        </div>
                        <span className="text-blue-200 text-sm">{order.driverNotes}</span>
                    </div>
                )}

                {/* Prep time (PREPARING status) */}
                {order.status === "PREPARING" && order.preparationMinutes && (
                    <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-violet-400 text-sm">
                            <Timer size={14} />
                            <span>~{order.estimatedReadyAt
                                ? Math.max(0, Math.round((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60000))
                                : order.preparationMinutes} min remaining</span>
                        </div>
                        <button
                            onClick={() => onEditPrepTime(order)}
                            className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-violet-500/10 transition-colors"
                        >
                            Edit
                        </button>
                    </div>
                )}

                {/* Needs approval */}
                {order.needsApproval && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                        <div className="text-[10px] text-rose-400 uppercase tracking-wider mb-1.5 font-semibold">Awaiting Approval</div>
                        <p className="text-rose-200 text-sm">This order requires manual approval. Call the customer to verify, then click Approve.</p>
                        {approvalReasons.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {approvalReasons.includes("FIRST_ORDER") && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-200">First order</span>
                                )}
                                {approvalReasons.includes("HIGH_VALUE") && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-200">Over €20</span>
                                )}
                                {approvalReasons.includes("OUT_OF_ZONE") && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-200">Outside delivery zone</span>
                                )}
                            </div>
                        )}
                        {isAdmin && (
                            <button
                                onClick={onOpenApprovalModal}
                                disabled={approvingOrder}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-green-500/10 text-green-400 border-green-500/30 hover:brightness-125 disabled:opacity-50"
                            >
                                ✓ Approve Order
                            </button>
                        )}
                        {isAdmin && order.user && (
                            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={suppressionUpdatingUserId === order.user?.id}
                                    checked={isApprovalModalSuppressed(order.user)}
                                    onChange={(e) => order.user && onSetApprovalModalSuppression(order.user, e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-900"
                                />
                                Don't auto-open approval modal for this user
                            </label>
                        )}
                    </div>
                )}

                {/* Location flagged */}
                {order.locationFlagged && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                        <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-1.5 font-semibold">Outside Delivery Zone</div>
                        <p className="text-orange-200 text-sm">The drop-off location is outside all active delivery zones. Confirm with the customer before dispatching.</p>
                    </div>
                )}

                {/* ── Items by business ── */}
                <div className="space-y-4">
                    {businessList.map((biz, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <Store size={14} className="text-violet-500" />
                                <span className="font-medium text-white text-sm">{biz.business.name}</span>
                                <span className="text-[10px] text-zinc-600 uppercase">{biz.business.businessType}</span>
                            </div>
                            <div className="overflow-hidden border border-zinc-800 rounded-lg">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[#09090b] border-b border-zinc-800">
                                            <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Price</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                                            {!isCompleted && <th className="px-3 py-2 w-8" />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getBusinessItemsSafe(biz).map((item, itemIdx) => {
                                            const displayUnitPrice = Number(item.unitPrice ?? item.basePrice ?? 0);
                                            const displayLineTotal = Number(item.quantity || 0) * displayUnitPrice;
                                            const invQty = (item as any).inventoryQuantity ?? 0;
                                            const marketQty = item.quantity - invQty;
                                            return (
                                                <tr key={itemIdx} className="border-b border-zinc-800/60 hover:bg-zinc-900/30">
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            {item.imageUrl && (
                                                                <img src={item.imageUrl} alt={item.name} className="w-7 h-7 rounded object-cover" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-white text-sm truncate">{item.name}</div>
                                                                <div className="text-zinc-600 text-xs">×{item.quantity}</div>
                                                                {item.notes && (
                                                                    <div className="text-blue-400 text-xs italic mt-1">Note: {item.notes}</div>
                                                                )}
                                                                {invQty > 0 && (
                                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                                                                            📦 {invQty} from stock
                                                                        </span>
                                                                        {marketQty > 0 && (
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 border border-zinc-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                                                                                🛒 {marketQty} from market
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-sm text-zinc-300">€{displayUnitPrice.toFixed(2)}</td>
                                                    <td className="px-3 py-2.5 text-right text-sm font-medium text-white">€{displayLineTotal.toFixed(2)}</td>
                                                    {!isCompleted && (
                                                        <td className="px-2 py-2.5 text-right">
                                                            <button
                                                                title="Remove item"
                                                                onClick={() => onRemoveItem({
                                                                    orderId: order.id,
                                                                    itemId: (item as any).id,
                                                                    itemName: item.name,
                                                                    itemQuantity: item.quantity,
                                                                })}
                                                                className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Price breakdown */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard size={13} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Price Breakdown</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="text-zinc-300">€{Number(orderTotals.itemsSubtotal ?? order.orderPrice).toFixed(2)}</span>
                    </div>
                    {orderTotals.itemsDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-1"><Tag size={11} /> Promotions ({promoSummary.orderCount})</span>
                            <span className="text-emerald-300">-€{orderTotals.itemsDiscount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-1"><Truck size={11} /> Delivery</span>
                        <span className="text-amber-300">€{Number(orderTotals.deliveryBase ?? order.deliveryPrice).toFixed(2)}</span>
                    </div>
                    {orderTotals.deliveryDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Delivery Promotion ({promoSummary.deliveryCount})</span>
                            <span className="text-emerald-300">-€{orderTotals.deliveryDiscount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-800">
                        <span className="text-emerald-300">Total</span>
                        <span className="text-emerald-300">€{order.totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Applied promotions */}
                {(order.orderPromotions?.length ?? 0) > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                                <Tag size={13} className="text-emerald-400" />
                                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                                    Applied Promotions ({promoSummary.totalCount})
                                </span>
                            </div>
                            <span className="text-xs font-semibold text-emerald-300">Saved €{promoSummary.totalSavings.toFixed(2)}</span>
                        </div>
                        {order.orderPromotions!.map((promo) => (
                            <div key={promo.id} className="flex items-center justify-between gap-2 text-sm rounded-lg border border-emerald-500/15 bg-[#0b120e] px-2.5 py-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                            {promo.appliesTo === "DELIVERY" ? "Delivery" : "Order"}
                                        </span>
                                        {promo.promoCode ? (
                                            <span className="font-mono text-xs text-zinc-300">{promo.promoCode}</span>
                                        ) : (
                                            <span className="text-[11px] text-zinc-500">Auto-applied</span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-emerald-300 font-semibold">-€{promo.discountAmount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Platform margin (admin only) */}
                {!isBusinessUser && preview && (() => {
                    const severity = getMarginSeverity(preview.netMargin);
                    const borderClass = severity === "healthy" ? "border-emerald-500/30" : severity === "negative" ? "border-rose-500/30" : "border-zinc-500/30";
                    const bgClass = severity === "healthy" ? "bg-emerald-500/10" : severity === "negative" ? "bg-rose-500/10" : "bg-zinc-500/10";
                    const textClass = severity === "healthy" ? "text-emerald-300" : severity === "negative" ? "text-rose-300" : "text-zinc-400";
                    return (
                        <div className={`border rounded-xl p-4 space-y-3 ${bgClass} ${borderClass}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] uppercase tracking-wider font-medium ${textClass}`}>Platform Margin</span>
                                <div className="flex items-center gap-2">
                                    {!preview.driverAssigned && (
                                        <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">No driver</span>
                                    )}
                                    <span className={`text-lg font-bold ${textClass}`}>
                                        {preview.netMargin >= 0 ? "+" : ""}€{preview.netMargin.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-400">
                                <span>Receivable <span className="text-emerald-300 font-semibold">€{preview.totalReceivable.toFixed(2)}</span></span>
                                <span>Payable <span className="text-rose-300 font-semibold">€{preview.totalPayable.toFixed(2)}</span></span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 text-xs">
                                {preview.lineItems.map((li: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-700/40 bg-[#09090b]/70 px-2.5 py-1.5">
                                        <span className="text-zinc-500 truncate mr-2">{li.reason}</span>
                                        <span className={`font-semibold whitespace-nowrap ${li.direction === "RECEIVABLE" ? "text-emerald-200" : "text-rose-300"}`}>
                                            {li.direction === "RECEIVABLE" ? "+" : "-"}€{li.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Inventory coverage (admin only) */}
                {isAdmin && (() => {
                    const coverage = coverageData?.orderCoverage;
                    if (coverageLoading) {
                        return (
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-2">Fulfillment Guide</div>
                                <div className="text-xs text-zinc-600">Loading coverage...</div>
                            </div>
                        );
                    }
                    if (!coverage || coverage.orderId !== order.id || coverage.allFromMarket) return null;
                    const stockItems = coverage.items.filter((i: any) => i.fromStock > 0 && i.fromMarket === 0);
                    const marketItems = coverage.items.filter((i: any) => i.fromMarket > 0 && i.fromStock === 0);
                    const mixedItems = coverage.items.filter((i: any) => i.fromMarket > 0 && i.fromStock > 0);
                    return (
                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package size={13} className="text-violet-400" />
                                    <span className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">Fulfillment Guide</span>
                                </div>
                                {coverage.deducted ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">✓ Stock deducted</span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={deductingStock}
                                        onClick={onDeductStock}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:brightness-125 disabled:opacity-50"
                                    >
                                        {deductingStock ? "Running..." : "↺ Force re-deduct"}
                                    </button>
                                )}
                            </div>
                            {(stockItems.length > 0 || mixedItems.length > 0) && (
                                <div className="space-y-1">
                                    <div className="text-[10px] text-violet-300/70 font-medium uppercase tracking-wider">📦 Pick from your stock</div>
                                    {[...stockItems, ...mixedItems].map((item: any) => (
                                        <div key={item.productId} className="flex items-center justify-between text-xs bg-violet-500/5 rounded-lg px-2 py-1.5">
                                            <span className="text-zinc-300 font-medium truncate mr-2">{item.productName}</span>
                                            <span className="text-violet-300 font-semibold whitespace-nowrap">×{item.fromStock}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(marketItems.length > 0 || mixedItems.length > 0) && (
                                <div className="space-y-1">
                                    <div className="text-[10px] text-zinc-400/70 font-medium uppercase tracking-wider">🛒 Buy from market</div>
                                    {[...marketItems, ...mixedItems].map((item: any) => (
                                        <div key={`${item.productId}-mkt`} className="flex items-center justify-between text-xs bg-zinc-500/5 rounded-lg px-2 py-1.5">
                                            <span className="text-zinc-400 truncate mr-2">{item.productName}</span>
                                            <span className="text-zinc-300 font-semibold whitespace-nowrap">×{item.fromMarket}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Comp delivery (active orders, admin only) */}
                {isAdmin && order.user && !isCompleted && (
                    <div className="pt-2 border-t border-zinc-800">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={grantingFreeDelivery}
                            onClick={onGrantFreeDelivery}
                            className="w-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                        >
                            {grantingFreeDelivery ? "Granting..." : "🎁 Comp next delivery (free delivery on next order)"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
