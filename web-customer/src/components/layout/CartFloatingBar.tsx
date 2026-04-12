"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCartDrawerStore } from "@/store/cartDrawerStore";
import { useTranslations } from "@/localization";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";

const HIDDEN_ON = ["/checkout", "/login", "/signup"];

export function CartFloatingBar() {
    const { t } = useTranslations();
    const pathname = usePathname();
    const itemCount = useCartStore((s) => s.getItemCount());
    const total = useCartStore((s) => s.getTotal());
    const openDrawer = useCartDrawerStore((s) => s.open);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || itemCount === 0) return null;
    if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

    return (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
            {/* Pulse ring */}
            <span className="absolute inset-4 bottom-4 rounded-2xl bg-[var(--primary)] opacity-0 animate-[breathe_3s_ease-in-out_infinite]" />
            <button
                onClick={openDrawer}
                className="relative flex w-full items-center justify-between rounded-2xl bg-[var(--primary)] px-5 py-4 text-white shadow-2xl hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all"
            >
                {/* Left: icon + count badge + label */}
                <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                        <ShoppingCart size={22} />
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[var(--primary)] shadow">
                            {itemCount}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight">{t("cart.view_cart")}</p>
                        <p className="text-xs text-white/70">
                            {itemCount} {itemCount === 1 ? t("common.item") : t("common.items")}
                        </p>
                    </div>
                </div>

                {/* Right: total + arrow */}
                <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold">{formatPrice(total)}</span>
                    <ArrowRight size={18} className="opacity-80" />
                </div>
            </button>
        </div>
    );
}
