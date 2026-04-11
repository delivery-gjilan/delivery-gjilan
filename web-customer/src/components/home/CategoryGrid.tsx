"use client";

import Link from "next/link";
import { useTranslations } from "@/localization";
import { UtensilsCrossed, ShoppingBasket, Heart, Sparkles, Coffee } from "lucide-react";

const CATEGORIES = [
    { key: "restaurants", icon: UtensilsCrossed, href: "/restaurants", color: "#ef4444" },
    { key: "grocery", icon: ShoppingBasket, href: "/market", color: "#22c55e" },
    { key: "health_wellness", icon: Heart, href: "/market?category=health", color: "#8b5cf6" },
    { key: "beauty_care", icon: Sparkles, href: "/market?category=beauty", color: "#ec4899" },
    { key: "drinks", icon: Coffee, href: "/market?category=drinks", color: "#f59e0b" },
];

export function CategoryGrid() {
    const { t } = useTranslations();

    return (
        <section>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map(({ key, icon: Icon, href, color }) => (
                    <Link
                        key={key}
                        href={href}
                        className="flex flex-col items-center gap-2 min-w-[80px] group"
                    >
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                            style={{ backgroundColor: `${color}15` }}
                        >
                            <Icon size={24} style={{ color }} />
                        </div>
                        <span className="text-xs font-medium text-[var(--foreground-secondary)] text-center whitespace-nowrap">
                            {t(`home.categories.${key}`)}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
