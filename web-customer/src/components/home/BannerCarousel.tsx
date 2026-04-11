"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
    id: string;
    title?: string | null;
    subtitle?: string | null;
    imageUrl?: string | null;
    mediaType?: string | null;
    linkType?: string | null;
    linkTarget?: string | null;
}

export function BannerCarousel({ banners }: { banners: Banner[] }) {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => {
        setCurrent((c) => (c + 1) % banners.length);
    }, [banners.length]);

    const prev = useCallback(() => {
        setCurrent((c) => (c - 1 + banners.length) % banners.length);
    }, [banners.length]);

    // Auto-scroll every 5s
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(next, 5000);
        return () => clearInterval(interval);
    }, [next, banners.length]);

    if (banners.length === 0) return null;

    const banner = banners[current];

    return (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
            <div className="relative h-40 sm:h-48 md:h-56 w-full bg-[var(--primary-light)]">
                {banner.imageUrl ? (
                    <Image
                        src={banner.imageUrl}
                        alt={banner.title || "Banner"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1200px) 100vw, 1200px"
                        priority
                    />
                ) : (
                    <div className="flex h-full items-center justify-center p-6">
                        <div>
                            {banner.title && (
                                <h3 className="text-xl font-bold text-[var(--primary-dark)]">
                                    {banner.title}
                                </h3>
                            )}
                            {banner.subtitle && (
                                <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                                    {banner.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
