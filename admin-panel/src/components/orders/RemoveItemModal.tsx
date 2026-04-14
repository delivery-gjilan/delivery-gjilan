"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import type { Order } from "./types";

interface RemoveItemDialogState {
    orderId: string;
    itemId: string;
    itemName: string;
    itemQuantity: number;
}

interface RemoveItemModalProps {
    dialog: RemoveItemDialogState | null;
    reason: string;
    quantity: number;
    loading: boolean;
    onReasonChange: (v: string) => void;
    onQuantityChange: (v: number) => void;
    onConfirm: () => void;
    onClose: () => void;
}

const REASON_PRESETS = ["Out of stock", "Item unavailable", "Preparation issue"];

export default function RemoveItemModal({
    dialog,
    reason,
    quantity,
    loading,
    onReasonChange,
    onQuantityChange,
    onConfirm,
    onClose,
}: RemoveItemModalProps) {
    return (
        <Modal isOpen={!!dialog} onClose={onClose} title="Remove Item">
            {dialog && (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300">
                        Remove <span className="font-semibold text-white">"{dialog.itemName}"</span> from this order?
                    </p>
                    <p className="text-xs text-zinc-500">
                        The customer will be notified with the reason. Order total will be updated.
                    </p>

                    {/* Quantity selector */}
                    {dialog.itemQuantity > 1 && (
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                Quantity to remove (of {dialog.itemQuantity})
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    −
                                </button>
                                <span className="text-lg font-bold text-white min-w-[2ch] text-center">{quantity}</span>
                                <button
                                    onClick={() => onQuantityChange(Math.min(dialog.itemQuantity, quantity + 1))}
                                    disabled={quantity >= dialog.itemQuantity}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    +
                                </button>
                                <button
                                    onClick={() => onQuantityChange(dialog.itemQuantity)}
                                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                                        quantity === dialog.itemQuantity
                                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                    }`}
                                >
                                    All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Reason</label>
                        <div className="flex flex-wrap gap-2">
                            {REASON_PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => onReasonChange(preset)}
                                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                                        reason === preset
                                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <Input
                            value={reason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder="Or type a custom reason…"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button variant="danger" onClick={onConfirm} disabled={!reason.trim() || loading}>
                            {loading ? "Removing…" : `Remove ${quantity}×`}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export type { RemoveItemDialogState };
