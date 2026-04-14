"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { Order } from "./types";

const CANCEL_REASON_PRESETS = [
    "Customer requested cancellation",
    "Business temporarily unavailable",
    "Driver unavailable for dispatch",
    "Out-of-service delivery zone",
];

interface CancelOrderModalProps {
    order: Order | null;
    reason: string;
    settleDriver: boolean;
    settleBusiness: boolean;
    loading: boolean;
    isBusinessUser: boolean;
    onReasonChange: (v: string) => void;
    onSettleDriverChange: (v: boolean) => void;
    onSettleBusinessChange: (v: boolean) => void;
    onConfirm: () => void;
    onClose: () => void;
}

export default function CancelOrderModal({
    order,
    reason,
    settleDriver,
    settleBusiness,
    loading,
    isBusinessUser,
    onReasonChange,
    onSettleDriverChange,
    onSettleBusinessChange,
    onConfirm,
    onClose,
}: CancelOrderModalProps) {
    const trimmedReason = reason.trim();

    return (
        <Modal
            isOpen={!!order}
            onClose={onClose}
            title="Cancel Order"
        >
            {order && (() => {
                const preview = !isBusinessUser ? order.settlementPreview ?? null : null;
                const hasDriver = !!order.driver;
                const businessReceivable = preview
                    ? preview.lineItems
                        .filter((lineItem) => lineItem.direction === "RECEIVABLE" && lineItem.businessId)
                        .reduce((sum, lineItem) => sum + lineItem.amount, 0)
                    : 0;
                const driverPayable = preview
                    ? preview.lineItems
                        .filter((lineItem) => lineItem.direction === "PAYABLE" && lineItem.driverId)
                        .reduce((sum, lineItem) => sum + lineItem.amount, 0)
                    : 0;

                return (
                    <div className="space-y-4">
                        {/* Order summary */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <div className="font-medium text-red-400">Order {order.displayId}</div>
                            {order.user && (
                                <div className="text-sm text-zinc-400 mt-0.5">
                                    {order.user.firstName} {order.user.lastName}
                                </div>
                            )}
                            <div className="text-sm text-zinc-500 mt-1">€{order.totalPrice.toFixed(2)}</div>
                        </div>

                        {/* Financial impact */}
                        {preview && (
                            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 space-y-2">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                    Settlement on Cancellation
                                </div>
                                <div className="text-[10px] text-zinc-600 mb-1">
                                    Check to create a settlement for that party even though the order is cancelled.
                                </div>
                                <div className="space-y-2">
                                    {/* Business → Platform */}
                                    <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={settleBusiness}
                                                onChange={(e) => onSettleBusinessChange(e.target.checked)}
                                                className="w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-sky-400 cursor-pointer"
                                            />
                                            <span className="text-xs text-zinc-400 select-none">
                                                <span className="text-sky-400 font-medium">Business</span>
                                                <span className="text-zinc-600 mx-1">→</span>
                                                <span className="text-zinc-300">Platform</span>
                                                <span className="text-zinc-600 ml-1 text-[10px]">(commission + markup)</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className={`font-semibold text-sm transition-colors ${settleBusiness ? "text-sky-300" : "text-zinc-500"}`}>
                                                ~€{businessReceivable.toFixed(2)}
                                            </span>
                                            <span className={`text-[10px] font-normal ${settleBusiness ? "text-sky-400" : "text-zinc-600"}`}>
                                                {settleBusiness ? "settle" : "skip"}
                                            </span>
                                        </div>
                                    </label>

                                    {/* Platform → Driver */}
                                    <label className={`flex items-center justify-between gap-3 ${hasDriver ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={settleDriver}
                                                onChange={(e) => onSettleDriverChange(e.target.checked)}
                                                disabled={!hasDriver}
                                                className="w-4 h-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-amber-400 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="text-xs text-zinc-400 select-none">
                                                <span className="text-zinc-300">Platform</span>
                                                <span className="text-zinc-600 mx-1">→</span>
                                                <span className={hasDriver ? "text-amber-400 font-medium" : "text-zinc-500"}>
                                                    {hasDriver
                                                        ? `Driver (${order.driver!.firstName} ${order.driver!.lastName})`
                                                        : "Driver (no driver assigned)"}
                                                </span>
                                                <span className="text-zinc-600 ml-1 text-[10px]">(delivery commission)</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className={`font-semibold text-sm transition-colors ${hasDriver ? (settleDriver ? "text-amber-300" : "text-zinc-500") : "text-zinc-600"}`}>
                                                ~€{driverPayable.toFixed(2)}
                                            </span>
                                            <span className={`text-[10px] font-normal ${!hasDriver ? "text-zinc-600" : settleDriver ? "text-amber-400" : "text-zinc-600"}`}>
                                                {!hasDriver ? "n/a" : settleDriver ? "settle" : "skip"}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                Cancellation Reason <span className="text-red-400">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {CANCEL_REASON_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => onReasonChange(preset)}
                                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${trimmedReason === preset
                                            ? "bg-red-500/20 border-red-500/40 text-red-300"
                                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                            }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={reason}
                                onChange={(e) => onReasonChange(e.target.value)}
                                placeholder="e.g. Customer requested cancellation by phone, restaurant closed early..."
                                rows={3}
                                className="w-full rounded-lg bg-[#09090b] border border-zinc-800 text-white text-sm px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 resize-none"
                            />
                            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                                <span>Reason is visible in admin audit trail.</span>
                                <span>{reason.length}/240</span>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={onClose}>
                                Go Back
                            </Button>
                            <Button
                                className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                                onClick={onConfirm}
                                disabled={loading || !trimmedReason}
                            >
                                {loading ? "Cancelling..." : "Confirm Cancel"}
                            </Button>
                        </div>
                    </div>
                );
            })()}
        </Modal>
    );
}
