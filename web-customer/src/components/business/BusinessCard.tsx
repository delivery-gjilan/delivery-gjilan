"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "@/localization";
import { useFavoritesStore } from "@/store/favoritesStore";
import { cn, formatPrice } from "@/lib/utils";
import { Star, Clock, Heart, Percent } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface BusinessCardProps {
    priority?: boolean;
    business: {
        id: string;
        name: string;
        imageUrl?: string | null;
        description?: string | null;
        isOpen?: boolean;
        ratingAverage?: number | null;
        ratingCount?: number | null;
        avgPrepTimeMinutes?: number | null;
        prepTimeOverrideMinutes?: number | null;
        businessType?: string | null;
        activePromotion?: {
            id: string;
            name: string;
            type: string;
            discountValue: number;
            spendThreshold?: number | null;
        } | null;
        minOrderAmount?: number | null;
    };
}

export function BusinessCard({ business, priority }: BusinessCardProps) {
    const { t } = useTranslations();
    const isFavorite = useFavoritesStore((s) => s.isFavorite(business.id));
    const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

    const prepTime = business.prepTimeOverrideMinutes ?? business.avgPrepTimeMinutes;

    return (
        <Link
            href={`/business/${business.id}`}
            className="group relative rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
            {/* Image */}
            <div className="relative h-44 w-full overflow-hidden bg-[var(--background-secondary)]">
                {business.imageUrl ? (
                    <Image
                        src={business.imageUrl}
                        alt={business.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={priority}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted)]">
                        <UtensilsCrossedIcon />
                    </div>
                )}

                {/* Closed overlay */}
                {!business.isOpen && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">
                            {t("restaurants.closed")}
                        </span>
                    </div>
                )}

                {/* Favorite button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(business.id);
                    }}
                    className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 backdrop-blur text-white shadow-sm hover:bg-black/60 transition-colors"
                >
                    <Heart
                        size={16}
                        className={cn(
                            "transition-colors",
                            isFavorite ? "fill-[#fb7185] text-[#fb7185]" : "text-white"
                        )}
                    />
                </button>

                {/* Promo badge */}
                {business.activePromotion && (
                    <div className="absolute bottom-2.5 left-2.5">
                        <Badge variant="success" className="gap-1 bg-[#009de0] text-white border-transparent">
                            <Percent size={12} />
                            {business.activePromotion.type === "PERCENTAGE"
                                ? `-${business.activePromotion.discountValue}%`
                                : business.activePromotion.type === "FREE_DELIVERY"
                                ? t("restaurants.free_delivery")
                                : `-€${business.activePromotion.discountValue}`}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-[var(--foreground)] text-base line-clamp-1">
                        {business.name}
                    </h3>
                    {business.ratingAverage != null && business.ratingAverage > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium text-[var(--foreground)]">
                                {business.ratingAverage.toFixed(1)}
                            </span>
                        </div>
                    )}
                </div>
                {business.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                        {business.description}
                    </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
                    {prepTime && (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--background-secondary)] px-2 py-0.5">
                            <Clock size={12} />
                            {prepTime} {t("common.min")}
                        </span>
                    )}
                    {business.minOrderAmount != null && business.minOrderAmount > 0 && (
                        <span className="rounded-full bg-[var(--background-secondary)] px-2 py-0.5">Min. {formatPrice(business.minOrderAmount)}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

function UtensilsCrossedIcon() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M16 2v7.5M12 2v7.5M20 2v7.5M16 9.5s-4 2-4 5.5v7M7 2l-1 6h5l-1-6M7.5 8C6.5 14 4 22 4 22h6s-2.5-8-2.5-14" />
        </svg>
    );
}
