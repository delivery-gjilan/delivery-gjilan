"use client";

import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { GET_FEATURED_BUSINESSES } from "@/graphql/operations/businesses";
import { GET_ACTIVE_BANNERS } from "@/graphql/operations/banners";
import { GET_ACTIVE_GLOBAL_PROMOTIONS } from "@/graphql/operations/promotions";
import { useTranslations } from "@/localization";
import { BusinessCard } from "@/components/business/BusinessCard";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function HomePage() {
    const { t } = useTranslations();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "open" | "promo">("all");

    const { data: businessesData, loading: businessesLoading } = useQuery(GET_BUSINESSES);
    const { data: featuredData } = useQuery(GET_FEATURED_BUSINESSES);
    const { data: bannersData } = useQuery(GET_ACTIVE_BANNERS, {
        variables: { displayContext: "HOME" },
    });

    const businesses = (businessesData as any)?.businesses ?? [];
    const featured = (featuredData as any)?.featuredBusinesses ?? [];
    const banners = (bannersData as any)?.getActiveBanners ?? [];

    const filteredBusinesses = useMemo(() => {
        let list = [...businesses];
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
    }, [businesses, search, filter]);

    return (
        <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-8">
            {/* Search Bar */}
            <div className="relative">
                <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    size={20}
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("common.search") + "..."}
                    className="w-full h-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-11 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors"
                />
            </div>

            {/* Banners */}
            {banners.length > 0 && <BannerCarousel banners={banners} />}

            {/* Categories */}
            <CategoryGrid />

            {/* Featured Section */}
            {featured.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">
                        {t("home.popular_now")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featured.slice(0, 6).map((biz: any) => (
                            <BusinessCard key={biz.id} business={biz} />
                        ))}
                    </div>
                </section>
            )}

            {/* Filter Tabs */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[var(--foreground)]">
                        {t("restaurants.title")}
                    </h2>
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

                {/* Business Grid */}
                {businessesLoading ? (
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
                ) : filteredBusinesses.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted)]">
                        <p>{t("restaurants.no_restaurants")}</p>
                        <p className="text-sm mt-1">{t("restaurants.try_different_search")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBusinesses.map((biz: any) => (
                            <BusinessCard key={biz.id} business={biz} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
