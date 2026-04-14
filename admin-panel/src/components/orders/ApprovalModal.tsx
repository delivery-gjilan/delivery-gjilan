"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Phone } from "lucide-react";
import { deriveApprovalReasons, isTrustedCustomer, isApprovalModalSuppressed } from "./helpers";
import type { Order } from "./types";

interface ApprovalModalProps {
    order: Order | null;
    approvingOrder: boolean;
    trustUpdatingUserId: string | null;
    suppressionUpdatingUserId: string | null;
    onApprove: () => void;
    onDismiss: () => void;
    onToggleTrusted: (user: NonNullable<Order["user"]>, trust: boolean) => void;
    onToggleSuppression: (user: NonNullable<Order["user"]>, suppress: boolean) => void;
}

export default function ApprovalModal({
    order,
    approvingOrder,
    trustUpdatingUserId,
    suppressionUpdatingUserId,
    onApprove,
    onDismiss,
    onToggleTrusted,
    onToggleSuppression,
}: ApprovalModalProps) {
    return (
        <Modal isOpen={!!order} onClose={onDismiss} title="Approve Order">
            {order && (
                <div className="space-y-4">
                    {/* Order summary */}
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                        <div className="font-medium text-rose-300">Order {order.displayId}</div>
                        {order.user && (
                            <>
                                <div className="text-sm text-zinc-400 mt-0.5">
                                    {order.user.firstName} {order.user.lastName}
                                </div>
                                {typeof order.user.totalOrders === "number" && (
                                    <div className="text-xs text-zinc-500 mt-1">
                                        {order.user.totalOrders} total orders
                                    </div>
                                )}
                                {order.user.phoneNumber && (
                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                                        <Phone size={11} className="text-zinc-600" />
                                        <a
                                            href={`tel:${order.user.phoneNumber}`}
                                            className="hover:text-white transition-colors"
                                        >
                                            {order.user.phoneNumber}
                                        </a>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <button
                                        type="button"
                                        disabled={trustUpdatingUserId === order.user.id}
                                        onClick={() =>
                                            onToggleTrusted(order.user!, !isTrustedCustomer(order.user))
                                        }
                                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                            isTrustedCustomer(order.user)
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                                : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                        }`}
                                    >
                                        {trustUpdatingUserId === order.user.id
                                            ? "Saving..."
                                            : isTrustedCustomer(order.user)
                                            ? "Trusted customer: enabled"
                                            : "Mark as trusted customer"}
                                    </button>
                                </div>
                                <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                                    <input
                                        type="checkbox"
                                        disabled={suppressionUpdatingUserId === order.user?.id}
                                        checked={isApprovalModalSuppressed(order.user)}
                                        onChange={(e) => {
                                            if (!order.user) return;
                                            onToggleSuppression(order.user, e.target.checked);
                                        }}
                                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-900"
                                    />
                                    Don&apos;t auto-open approval modal again for this user
                                </label>
                            </>
                        )}
                        <div className="text-sm text-zinc-500 mt-1">€{order.totalPrice.toFixed(2)}</div>
                    </div>

                    {/* Reason flags */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Approval flags</div>
                        {deriveApprovalReasons(order).includes("FIRST_ORDER") && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium">
                                🆕 First order — customer has no previous orders
                            </div>
                        )}
                        {deriveApprovalReasons(order).includes("HIGH_VALUE") && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                                💰 High value order (over €20)
                            </div>
                        )}
                        {deriveApprovalReasons(order).includes("OUT_OF_ZONE") && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium">
                                📍 Outside delivery zone — confirm drop-off address with customer
                            </div>
                        )}
                        {deriveApprovalReasons(order).length === 0 && order.needsApproval && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                                ⚠ Manual verification required before approval
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-zinc-400">
                        Confirm you have called/verified this order. On approval, status moves to{" "}
                        <span className="text-white font-medium">Pending</span> and businesses are notified.
                    </p>

                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onDismiss}>
                            Go Back
                        </Button>
                        <Button
                            className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                            onClick={onApprove}
                            disabled={approvingOrder}
                        >
                            {approvingOrder ? "Approving..." : "✓ Approve & Send to Business"}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
