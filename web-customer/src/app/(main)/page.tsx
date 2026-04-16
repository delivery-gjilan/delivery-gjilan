"use client";

import { useQuery } from "@apollo/client/react";
import { GET_FEATURED_BUSINESSES } from "@/graphql/operations/businesses";
import { GET_ACTIVE_BANNERS } from "@/graphql/operations/banners";
import { useTranslations } from "@/localization";
import { BusinessCard } from "@/components/business/BusinessCard";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo } from "react";
import { useHydratedBusinesses } from "@/hooks/useHydratedBusinesses";
import { useSearchStore } from "@/store/searchStore";
import type { GqlBusiness, GqlBanner } from "@/types/graphql";

export default function HomePage() {
    const { t } = useTranslations();
    const searchQuery = useSearchStore((s) => s.query);

    const { businesses, loading: businessesLoading } = useHydratedBusinesses();
    const { data: featuredData } = useQuery(GET_FEATURED_BUSINESSES);
    const { data: bannersData } = useQuery(GET_ACTIVE_BANNERS, {
        variables: { displayContext: "HOME" },
    });

    const featured = (featuredData as { featuredBusinesses?: GqlBusiness[] } | undefined)?.featuredBusinesses ?? [];
    const banners = (bannersData as { getActiveBanners?: GqlBanner[] } | undefined)?.getActiveBanners ?? [];
    const fallbackBanners = [
        {
            id: "template-banner-1",
            title: "20% off your first order",
            subtitle: "Use code WELCOME20 at checkout",
            imageUrl: null,
        },
        {
            id: "template-banner-2",
            title: "Free delivery this weekend",
            subtitle: "Selected restaurants only",
            imageUrl: null,
        },
        {
            id: "template-banner-3",
            title: "New places in town",
            subtitle: "Fresh menus added daily",
            imageUrl: null,
        },
    ];
    const bannersToShow = banners.length > 0 ? banners : fallbackBanners;

    const filteredBusinesses = useMemo(() => {
        if (!searchQuery) return [...businesses];
        const q = searchQuery.toLowerCase();
        return (businesses as GqlBusiness[]).filter(
            (b) => b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
        );
    }, [businesses, searchQuery]);

    return (
        <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-8">
            {/* Banners */}
            <BannerCarousel banners={bannersToShow} />

            {/* Featured Section */}
            {featured.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">
                        {t("home.popular_now")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {featured.slice(0, 6).map((biz: GqlBusiness, i: number) => (
                            <BusinessCard key={biz.id} business={biz} priority={i === 0} />
                        ))}
                    </div>
                </section>
            )}

            {/* All Restaurants */}
            <section>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">
                    {t("restaurants.title")}
                </h2>

                {/* Business Grid */}
                {businessesLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredBusinesses.map((biz: GqlBusiness, i: number) => (
                            <BusinessCard key={biz.id} business={biz} priority={i === 0} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
