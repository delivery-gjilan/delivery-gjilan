"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { useSearchStore } from "@/store/searchStore";
import { cn } from "@/lib/utils";
import {
    UtensilsCrossed,
    ShoppingBag,
    ClipboardList,
    User,
    Search,
    Globe,
    LogOut,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", icon: UtensilsCrossed, labelKey: "tabs.restaurants" },
    { href: "/market", icon: ShoppingBag, labelKey: "tabs.market" },
] as const;

export function Header() {
    const { isAuthenticated, logout } = useAuth();
    const { t, locale, setLocale } = useTranslations();
    const pathname = usePathname();

    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const setSearchQuery = useSearchStore((s) => s.setQuery);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showSearch = pathname === "/" || pathname.startsWith("/market");
    const searchPlaceholder = pathname.startsWith("/market")
        ? t("market.search_products")
        : t("common.search") + "...";

    // Clear search when navigating away from search-enabled pages
    useEffect(() => {
        if (!showSearch) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setQuery("");
            setSearchQuery("");
        }
    }, [showSearch, setSearchQuery]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(value.trim()), 350);
    };

    // Clear debounce on unmount
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const toggleLocale = () => setLocale(locale === "en" ? "al" : "en");

    return (
        <>
            {/* Desktop Main Header */}
            <header className="sticky top-0 z-50 hidden md:block border-b border-[var(--border)] bg-[var(--background-secondary)]/95 backdrop-blur-sm">
                <div className="mx-auto flex h-16 max-w-[var(--max-content-width)] items-center gap-4 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#009de0] text-white font-bold text-lg shadow-sm">
                            Z
                        </div>
                        <span className="text-xl font-bold text-[var(--foreground)]">Zipp Go</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="flex items-center gap-1 flex-1 justify-center">
                        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
                            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-[#009de0]/20 text-[var(--primary)]"
                                            : "text-[var(--foreground-secondary)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    <Icon size={18} />
                                    <span>{t(labelKey)}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Profile icon */}
                        <Link
                            href={isAuthenticated ? "/profile" : "/login"}
                            className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                                pathname.startsWith("/profile")
                                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                                    : "border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            )}
                        >
                            <User size={17} />
                        </Link>
                        <button
                            onClick={toggleLocale}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:bg-[var(--card)] transition-colors"
                        >
                            <Globe size={16} />
                            <span className="uppercase">{locale}</span>
                        </button>

                        {isAuthenticated ? (
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--card)] hover:text-[var(--danger)] transition-colors"
                            >
                                <LogOut size={16} />
                                <span>{t("auth.logout")}</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
                                >
                                    {t("auth.sign_in")}
                                </Link>
                                <Link
                                    href="/signup"
                                    className="rounded-xl bg-[#009de0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7] transition-colors"
                                >
                                    {t("auth.sign_up")}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Desktop Search Bar — only on / (not market, market embeds it in its own sticky bar) */}
            {showSearch && pathname === "/" && (
            <div className="sticky top-16 z-40 hidden md:flex justify-center py-3">
                <div className="w-full max-w-2xl px-4">
                    <div className="relative">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                            size={18}
                        />
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full h-10 rounded-full border border-[var(--border)] bg-[var(--card)] pl-11 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors"
                        />
                    </div>
                </div>
            </div>
            )}

            {/* Mobile Top Search Bar — only on / and /market */}
            {showSearch && (
            <div className="sticky top-0 z-50 block md:hidden border-b border-[var(--border)] bg-[var(--background-secondary)]/95 backdrop-blur-sm">
                <div className="flex items-center h-14 px-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                                size={17}
                            />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full h-10 rounded-full border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return (
                            <Link
                                key={`${href}-mobile`}
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
                    {/* Orders tab — authenticated only */}
                    {isAuthenticated && (
                        <Link
                            href="/orders"
                            className={cn(
                                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                                pathname.startsWith("/orders")
                                    ? "text-[var(--primary)]"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            <ClipboardList size={22} strokeWidth={pathname.startsWith("/orders") ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{t("tabs.orders")}</span>
                        </Link>
                    )}
                    {/* Profile */}
                    <Link
                        href={isAuthenticated ? "/profile" : "/login"}
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                            pathname.startsWith("/profile")
                                ? "text-[var(--primary)]"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                    >
                        <User size={22} strokeWidth={pathname.startsWith("/profile") ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{t("tabs.profile")}</span>
                    </Link>
                </div>
            </nav>
        </>
    );
}
