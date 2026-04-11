"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";
import {
    Home,
    UtensilsCrossed,
    ShoppingBag,
    ClipboardList,
    User,
    ShoppingCart,
    Search,
    Globe,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", icon: Home, labelKey: "tabs.home" },
    { href: "/restaurants", icon: UtensilsCrossed, labelKey: "tabs.restaurants" },
    { href: "/market", icon: ShoppingBag, labelKey: "tabs.shops" },
    { href: "/orders", icon: ClipboardList, labelKey: "tabs.orders" },
    { href: "/profile", icon: User, labelKey: "tabs.profile" },
] as const;

export function Header() {
    const { isAuthenticated } = useAuth();
    const { t, locale, setLocale } = useTranslations();
    const pathname = usePathname();
    const itemCount = useCartStore((s) => s.getItemCount());

    const toggleLocale = () => setLocale(locale === "en" ? "al" : "en");

    return (
        <>
            {/* Desktop Header */}
            <header className="sticky top-0 z-50 hidden md:block border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
                <div className="mx-auto flex h-16 max-w-[var(--max-content-width)] items-center justify-between px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-white font-bold text-lg">
                            Z
                        </div>
                        <span className="text-xl font-bold text-[var(--foreground)]">Zipp Go</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
                            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-[var(--primary-light)] text-[var(--primary)]"
                                            : "text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    <Icon size={18} />
                                    <span>{t(labelKey)}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLocale}
                            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                        >
                            <Globe size={16} />
                            <span className="uppercase">{locale}</span>
                        </button>

                        {isAuthenticated ? (
                            <Link
                                href="/cart"
                                className="relative flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] transition-colors"
                            >
                                <ShoppingCart size={18} />
                                <span>{t("cart.view_cart")}</span>
                                {itemCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-[11px] font-bold text-white">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] transition-colors"
                            >
                                {t("auth.sign_in")}
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                                    isActive
                                        ? "text-[var(--primary)]"
                                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                )}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{t(labelKey)}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
