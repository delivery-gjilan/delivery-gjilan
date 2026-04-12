"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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

const GRADIENTS = [
    "from-[#009de0] to-[#006da3]",
    "from-[#1a1a2e] to-[#0f3460]",
    "from-[#7209b7] to-[#3a0ca3]",
];

export function BannerCarousel({ banners }: { banners: Banner[] }) {
    const getBannerHref = (banner: Banner): string | null => {
        const { linkType, linkTarget } = banner;
        if (!linkType || linkType === "none" || !linkTarget) return null;
        switch (linkType) {
            case "business": return `/business/${linkTarget}`;
            case "product": return `/product/${linkTarget}`;
            case "external": return linkTarget;
            default: return null;
        }
    };
    const [current, setCurrent] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const currentRef = useRef(0);

    const applyOffset = useCallback((index: number) => {
        if (!trackRef.current || !containerRef.current) return;
        const cw = containerRef.current.offsetWidth;
        const itemWidth = window.innerWidth >= 1024 ? cw / 2 : cw;
        trackRef.current.style.transform = `translateX(-${index * itemWidth}px)`;
    }, []);

    useEffect(() => {
        currentRef.current = current;
        applyOffset(current);
    }, [current, applyOffset]);

    useEffect(() => {
        const handleResize = () => applyOffset(currentRef.current);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [applyOffset]);

    const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length]);
    const prev = useCallback(() => setCurrent((c) => (c - 1 + banners.length) % banners.length), [banners.length]);

    useEffect(() => {
        if (banners.length <= 1) return;
        const t = setInterval(next, 5000);
        return () => clearInterval(t);
    }, [next, banners.length]);

    if (!banners.length) return null;

    return (
        <div className="relative">
            {/* Track container */}
            <div ref={containerRef} className="overflow-hidden">
                <div
                    ref={trackRef}
                    className="flex"
                    style={{ transition: "transform 0.5s ease-in-out", willChange: "transform" }}
                >
                    {banners.map((banner, i) => {
                        const href = getBannerHref(banner);
                        const cardClassName = `relative h-64 sm:h-80 lg:h-[400px] rounded-2xl overflow-hidden ${
                            !banner.imageUrl
                                ? `bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`
                                : "bg-[var(--background-secondary)]"
                        }${href ? " cursor-pointer" : ""}`;
                        const cardContent = (
                            <>
                                {banner.imageUrl ? (
                                    <Image
                                        src={banner.imageUrl}
                                        alt={banner.title || "Banner"}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        priority={i < 2}
                                    />
                                ) : (
                                    <div className="flex h-full flex-col justify-end p-8">
                                        {banner.title && (
                                            <h3 className="text-3xl font-extrabold text-white leading-tight max-w-xs">
                                                {banner.title}
                                            </h3>
                                        )}
                                        {banner.subtitle && (
                                            <p className="text-white/70 text-sm mt-2">
                                                {banner.subtitle}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                        return (
                            <div
                                key={banner.id}
                                className="flex-shrink-0 w-full lg:w-1/2 lg:pr-3 last:lg:pr-0"
                            >
                                {href && banner.linkType === "external" ? (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cardClassName}
                                        style={{ display: "block" }}
                                    >
                                        {cardContent}
                                    </a>
                                ) : href ? (
                                    <Link href={href} className={cardClassName} style={{ display: "block" }}>
                                        {cardContent}
                                    </Link>
                                ) : (
                                    <div className={cardClassName}>
                                        {cardContent}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Navigation arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-50 transition-colors dark:bg-[var(--card)] dark:text-white dark:border dark:border-[var(--border)]"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next"
                        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-50 transition-colors dark:bg-[var(--card)] dark:text-white dark:border dark:border-[var(--border)]"
                    >
                        <ChevronRight size={18} />
                    </button>

                    {/* Dots */}
                    <div className="flex justify-center gap-1.5 mt-3">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                aria-label={`Go to banner ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === current
                                        ? "w-6 bg-[var(--primary)]"
                                        : "w-1.5 bg-[var(--muted)]"
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
