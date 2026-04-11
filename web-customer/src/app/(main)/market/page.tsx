"use client";

import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { useTranslations } from "@/localization";
import { BusinessCard } from "@/components/business/BusinessCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function MarketPage() {
    const { t } = useTranslations();
    const [search, setSearch] = useState("");
    const { data, loading } = useQuery(GET_BUSINESSES);

    const shops = useMemo(() => {
        let list = ((data as any)?.businesses ?? []).filter((b: any) => b.businessType !== "RESTAURANT");
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (b: any) =>
                    b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [data, search]);

    return (
        <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("market.title")}</h1>

            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("market.search_products")}
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
            ) : shops.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted)]">
                    <p>{t("market.no_market")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shops.map((biz: any) => (
                        <BusinessCard key={biz.id} business={biz} />
                    ))}
                </div>
            )}
        </div>
    );
}
