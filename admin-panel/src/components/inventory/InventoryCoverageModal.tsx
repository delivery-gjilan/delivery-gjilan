"use client";

import Modal from "@/components/ui/Modal";
import { Package, ShoppingCart } from "lucide-react";

interface CoverageItem {
    productId: string;
    productName: string;
    productImageUrl?: string | null;
    orderedQty: number;
    fromStock: number;
    fromMarket: number;
    status: string;
    deducted: boolean;
}

interface Coverage {
    orderId: string;
    items: CoverageItem[];
    totalItems: number;
    fullyOwnedCount: number;
    partiallyOwnedCount: number;
    marketOnlyCount: number;
    allFromStock: boolean;
    allFromMarket: boolean;
    deducted: boolean;
}

interface Props {
    orderId: string;
    displayId: string;
    coverage: Coverage | null | undefined;
    loading: boolean;
    onClose: () => void;
}

export default function InventoryCoverageModal({ orderId, displayId, coverage, loading, onClose }: Props) {
    const stockItems = coverage?.items.filter((i) => i.fromStock > 0 && i.fromMarket === 0) ?? [];
    const marketItems = coverage?.items.filter((i) => i.fromMarket > 0 && i.fromStock === 0) ?? [];
    const mixedItems = coverage?.items.filter((i) => i.fromStock > 0 && i.fromMarket > 0) ?? [];

    return (
        <Modal isOpen onClose={onClose} title={`📦 Fulfillment Guide — #${displayId}`}>
            {loading ? (
                <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
                    Loading coverage...
                </div>
            ) : !coverage || coverage.orderId !== orderId ? (
                <div className="py-8 text-center text-zinc-600 text-sm">No coverage data available.</div>
            ) : coverage.allFromMarket ? (
                <div className="py-6 text-center text-zinc-500 text-sm">
                    All items sourced from market — no stock involvement.
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-violet-300">{coverage.fullyOwnedCount}</div>
                            <div className="text-xs text-violet-400 mt-1">From your stock</div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-amber-300">{coverage.partiallyOwnedCount}</div>
                            <div className="text-xs text-amber-400 mt-1">Partial coverage</div>
                        </div>
                        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-zinc-300">{coverage.marketOnlyCount}</div>
                            <div className="text-xs text-zinc-400 mt-1">Market only</div>
                        </div>
                    </div>

                    {/* Deducted badge */}
                    {coverage.deducted && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                            <span className="text-emerald-300 text-xs font-semibold">✓ Stock already deducted for this order</span>
                        </div>
                    )}

                    {/* Pick from stock */}
                    {(stockItems.length > 0 || mixedItems.length > 0) && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-violet-400" />
                                <span className="text-sm font-semibold text-violet-300">Pick from your stock</span>
                            </div>
                            <div className="space-y-1.5">
                                {[...stockItems, ...mixedItems].map((item) => (
                                    <div
                                        key={item.productId}
                                        className="flex items-center gap-3 bg-violet-500/5 border border-violet-500/15 rounded-lg px-3 py-2.5"
                                    >
                                        {item.productImageUrl ? (
                                            <img
                                                src={item.productImageUrl}
                                                alt={item.productName}
                                                className="w-9 h-9 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                <Package size={13} className="text-zinc-600" />
                                            </div>
                                        )}
                                        <span className="text-sm text-white flex-1 font-medium">{item.productName}</span>
                                        <span className="text-violet-300 font-bold text-lg">×{item.fromStock}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Buy from market */}
                    {(marketItems.length > 0 || mixedItems.length > 0) && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={14} className="text-zinc-400" />
                                <span className="text-sm font-semibold text-zinc-300">Buy from market</span>
                            </div>
                            <div className="space-y-1.5">
                                {[...marketItems, ...mixedItems].map((item) => (
                                    <div
                                        key={`${item.productId}-mkt`}
                                        className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5"
                                    >
                                        {item.productImageUrl ? (
                                            <img
                                                src={item.productImageUrl}
                                                alt={item.productName}
                                                className="w-9 h-9 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                <Package size={13} className="text-zinc-600" />
                                            </div>
                                        )}
                                        <span className="text-sm text-zinc-300 flex-1">{item.productName}</span>
                                        <span className="text-zinc-200 font-bold text-lg">×{item.fromMarket}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
