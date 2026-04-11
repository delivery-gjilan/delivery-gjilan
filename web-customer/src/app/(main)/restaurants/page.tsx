"use client";

import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { useTranslations } from "@/localization";
import { BusinessCard } from "@/components/business/BusinessCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function RestaurantsPage() {
    const { t } = useTranslations();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "open" | "promo">("all");
    const { data, loading } = useQuery(GET_BUSINESSES);

    const restaurants = useMemo(() => {
        let list = ((data as any)?.businesses ?? []).filter((b: any) => b.businessType === "RESTAURANT");
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (b: any) =>
                    b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
            );
        }
        if (filter === "open") list = list.filter((b: any) => b.isOpen);
        if (filter === "promo") list = list.filter((b: any) => b.activePromotion);
        return list;
    }, [data, search, filter]);

    return (
        <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">
                        {t("restaurants.title")}
                    </h1>
                    <p className="text-sm text-[var(--foreground-secondary)]">{t("restaurants.city")}</p>
                </div>
                <div className="flex gap-2">
                    {(["all", "open", "promo"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                filter === f
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                            }`}
                        >
                            {f === "all"
                                ? t("restaurants.filters.all")
                                : f === "open"
                                ? t("restaurants.filters.open_now")
                                : t("restaurants.filters.with_discounts")}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("common.search") + "..."}
                    className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
                            <Skeleton className="h-40 w-full rounded-none" />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : restaurants.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted)]">
                    <p className="text-lg">{t("restaurants.no_restaurants")}</p>
                    <p className="text-sm mt-1">{t("restaurants.try_different_search")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.map((biz: any) => (
                        <BusinessCard key={biz.id} business={biz} />
                    ))}
                </div>
            )}
        </div>
    );
}
