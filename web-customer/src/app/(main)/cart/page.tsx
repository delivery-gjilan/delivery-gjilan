"use client";

import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "@/localization";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";

export default function CartPage() {
    const { t } = useTranslations();
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const clearCart = useCartStore((s) => s.clearCart);
    const getTotal = useCartStore((s) => s.getTotal);
    const getItemCount = useCartStore((s) => s.getItemCount);

    const total = getTotal();
    const itemCount = getItemCount();

    // Group by business
    const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
        const key = item.businessId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <ShoppingBag size={48} className="mx-auto text-[var(--muted)]" />
                <h2 className="text-xl font-bold text-[var(--foreground)]">{t("cart.empty_title")}</h2>
                <p className="text-sm text-[var(--foreground-secondary)]">{t("cart.empty_message")}</p>
                <Link href="/">
                    <Button>{t("cart.start_shopping")}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                    <ArrowLeft size={16} />
                    {t("common.back")}
                </Link>
                <button
                    onClick={clearCart}
                    className="text-sm text-[var(--danger)] hover:underline"
                >
                    {t("cart.clear_all")}
                </button>
            </div>

            <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {t("cart.title")} ({itemCount})
            </h1>

            {Object.entries(grouped).map(([bizId, bizItems]) => (
                <div key={bizId} className="space-y-3">
                    {bizItems[0].businessName && (
                        <h3 className="text-sm font-semibold text-[var(--foreground-secondary)]">
                            {bizItems[0].businessName}
                        </h3>
                    )}
                    <div className="space-y-2">
                        {bizItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3"
                            >
                                {item.imageUrl && (
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--background-secondary)]">
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-[var(--foreground)] truncate">
                                        {item.name}
                                    </h4>
                                    {item.selectedOptions.length > 0 && (
                                        <p className="text-xs text-[var(--muted)] mt-0.5 truncate">
                                            {item.selectedOptions.map((o) => o.optionName).join(", ")}
                                        </p>
                                    )}
                                    {item.notes && (
                                        <p className="text-xs text-[var(--muted)] mt-0.5 italic truncate">
                                            {item.notes}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-bold text-[var(--foreground)]">
                                            {formatPrice(
                                                (item.unitPrice +
                                                    item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) *
                                                    item.quantity
                                            )}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {item.quantity === 1 ? (
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                            )}
                                            <span className="text-sm font-medium w-5 text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Summary + Checkout */}
            <div className="sticky bottom-20 md:bottom-0 bg-[var(--background)] border-t border-[var(--border)] -mx-4 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">{t("cart.subtotal")}</span>
                    <span className="font-bold text-[var(--foreground)]">{formatPrice(total)}</span>
                </div>
                <Link href="/checkout">
                    <Button size="lg" className="w-full">
                        {t("cart.proceed_to_checkout")} · {formatPrice(total)}
                    </Button>
                </Link>
            </div>
        </div>
    );
}
