"use client";

import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "@/localization";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";

const HIDDEN_ON = ["/cart", "/checkout", "/login", "/signup"];

export function CartFloatingBar() {
    const { isAuthenticated } = useAuth();
    const { t } = useTranslations();
    const pathname = usePathname();
    const itemCount = useCartStore((s) => s.getItemCount());
    const total = useCartStore((s) => s.getTotal());

    if (!isAuthenticated || itemCount === 0) return null;
    if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

    return (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
            <Link
                href="/cart"
                className="flex items-center justify-between rounded-2xl bg-[var(--primary)] px-5 py-3.5 text-white shadow-lg hover:bg-[var(--primary-hover)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ShoppingCart size={20} />
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--primary)]">
                            {itemCount}
                        </span>
                    </div>
                    <span className="font-medium">{t("cart.view_cart")}</span>
                </div>
                <span className="font-bold">{formatPrice(total)}</span>
            </Link>
        </div>
    );
}
