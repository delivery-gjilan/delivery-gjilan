"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/store/favoritesStore";
import Link from "next/link";
import {
    User,
    MapPin,
    Globe,
    LogOut,
    Loader2,
    ChevronRight,
    Moon,
    Sun,
    History,
} from "lucide-react";
import { SET_MY_PREFERRED_LANGUAGE_MUTATION } from "@/graphql/operations/auth/setMyPreferredLanguage";
import { SET_MY_EMAIL_OPT_OUT_MUTATION } from "@/graphql/operations/auth/setMyEmailOptOut";
import { GET_ORDERS } from "@/graphql/operations/orders";
import type { GqlOrder } from "@/types/graphql";

const ACTIVE_STATUSES = ["AWAITING_APPROVAL", "PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { t, locale, setLocale } = useTranslations();

    const [theme, setTheme] = useState<"light" | "dark">("dark");

    const [setLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);
    const [setEmailOptOut] = useMutation(SET_MY_EMAIL_OPT_OUT_MUTATION);

    const { data: ordersData, loading: ordersLoading, error: ordersError } = useQuery(GET_ORDERS, {
        skip: !user,
        fetchPolicy: "network-only",
        variables: { limit: 50, offset: 0 },
        errorPolicy: "ignore", // Don't fail the whole component on auth errors
    });

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark") {
            setTheme(saved);
        } else {
            setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
        }
    }, []);

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <User size={48} className="mx-auto text-[var(--muted)]" />
                <h2 className="text-xl font-bold">{t("auth.login_required")}</h2>
                <div className="flex gap-3 justify-center">
                    <Link href="/login">
                        <Button>{t("auth.login")}</Button>
                    </Link>
                    <Link href="/signup">
                        <Button variant="outline">{t("auth.sign_up")}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const ordersPayload = (ordersData as { orders?: GqlOrder[] | { orders?: GqlOrder[] } } | undefined)?.orders;
    const allOrders: GqlOrder[] = Array.isArray(ordersPayload)
        ? ordersPayload
        : ordersPayload && typeof ordersPayload === "object" && "orders" in ordersPayload && Array.isArray(ordersPayload.orders)
        ? ordersPayload.orders
        : [];
    const activeOrders = allOrders.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
    const ordersSubtitle = ordersLoading
        ? "..."
        : ordersError
        ? t("orders.no_past_orders")
        : allOrders.length > 0
        ? `${allOrders.length} order${allOrders.length !== 1 ? "s" : ""}${activeOrders.length > 0 ? ` · ${activeOrders.length} active` : ""}`
        : t("orders.no_past_orders");

    const handleToggleLanguage = async () => {
        const newLocale = locale === "en" ? "al" : "en";
        setLocale(newLocale);
        try {
            await setLanguage({ variables: { language: newLocale === "al" ? "sq" : "en" } });
        } catch {
            // ignore
        }
    };

    const handleToggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        localStorage.setItem("theme", next);
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>

            {/* User Info */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white text-lg font-bold">
                        {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-[var(--muted)]">{user.email}</p>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                <Link
                    href="/orders"
                    className="flex items-center gap-4 px-5 py-5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <History size={20} className="text-[var(--foreground-secondary)] shrink-0" />
                    <span className="flex-1 text-base font-medium">{t("orders.title")}</span>
                    <span className="text-sm text-[var(--muted)]">{ordersSubtitle}</span>
                    <ChevronRight size={16} className="text-[var(--muted)]" />
                </Link>
                <Link
                    href="/addresses"
                    className="flex items-center gap-4 px-5 py-5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <MapPin size={20} className="text-[var(--foreground-secondary)] shrink-0" />
                    <span className="flex-1 text-base font-medium">My Addresses</span>
                    <ChevronRight size={16} className="text-[var(--muted)]" />
                </Link>
            </div>

            {/* Preferences */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                <button
                    onClick={handleToggleLanguage}
                    className="flex w-full items-center gap-4 px-5 py-5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <Globe size={20} className="text-[var(--foreground-secondary)] shrink-0" />
                    <span className="flex-1 text-base font-medium text-left">{t("profile.language")}</span>
                    <span className="text-sm font-medium text-[var(--primary)]">
                        {locale === "en" ? "English" : "Shqip"}
                    </span>
                </button>
                <button
                    onClick={handleToggleTheme}
                    className="flex w-full items-center gap-4 px-5 py-5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    {theme === "light" ? (
                        <Sun size={20} className="text-[var(--foreground-secondary)] shrink-0" />
                    ) : (
                        <Moon size={20} className="text-[var(--foreground-secondary)] shrink-0" />
                    )}
                    <span className="flex-1 text-base font-medium text-left">{t("profile.theme")}</span>
                    <span className="text-sm font-medium text-[var(--primary)]">
                        {theme === "light" ? t("profile.light") : t("profile.dark")}
                    </span>
                </button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-4 px-5 py-5 text-base font-medium h-auto" onClick={logout}>
                    <LogOut size={20} />
                    {t("auth.logout")}
                </Button>
            </div>
        </div>
    );
}
