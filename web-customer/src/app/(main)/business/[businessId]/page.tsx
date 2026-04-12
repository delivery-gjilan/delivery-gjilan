"use client";

import { useQuery } from "@apollo/client/react";
import { GET_BUSINESS } from "@/graphql/operations/businesses";
import { GET_PRODUCTS, GET_PRODUCT_CATEGORIES } from "@/graphql/operations/products";
import { useTranslations } from "@/localization";
import { useCartStore } from "@/store/cartStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect, use } from "react";
import { Star, Clock, MapPin, ArrowLeft, Percent, Search, ShoppingBag, Plus, Minus } from "lucide-react";
import { ProductOptionsModal } from "@/components/business/ProductOptionsModal";

export default function BusinessDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = use(params);
    const { t } = useTranslations();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [modalProductId, setModalProductId] = useState<string | null>(null);
    const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
    const tabsRef = useRef<HTMLDivElement>(null);
    const activeBtnRef = useRef<HTMLButtonElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const { data: bizData, loading: bizLoading } = useQuery(GET_BUSINESS, {
        variables: { id: businessId },
    });
    const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
        variables: { businessId },
    });
    const { data: categoriesData } = useQuery(GET_PRODUCT_CATEGORIES, {
        variables: { businessId },
    });

    const business = (bizData as any)?.business;
    const categories = (categoriesData as any)?.productCategories ?? [];
    const allProducts = (productsData as any)?.products ?? [];

    const products = useMemo(() => {
        let list = allProducts.map((p: any) => {
            const prod = p?.product ?? p;
            if (!prod) return null;
            return {
                ...prod,
                hasOptionGroups: p?.hasOptionGroups ?? false,
                variants: p?.variants?.length ? p.variants : (prod.variants ?? []),
            };
        }).filter(Boolean);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((p: any) =>
                p?.name?.toLowerCase().includes(q) || p?.description?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allProducts, search]);

    const categoryMap = useMemo(() => {
        const m = new Map<string, any>();
        for (const c of categories) m.set(c.id, c);
        return m;
    }, [categories]);

    const groupedProducts = useMemo(() => {
        const groups = new Map<string, { id: string; name: string; products: any[] }>();
        for (const p of products) {
            const id = p.categoryId ?? "uncategorized";
            const name = categoryMap.get(id)?.name ?? t("business.uncategorized");
            if (!groups.has(id)) groups.set(id, { id, name, products: [] });
            groups.get(id)!.products.push(p);
        }
        const ordered: Array<{ id: string; name: string; products: any[] }> = [];
        for (const c of categories) {
            const group = groups.get(c.id);
            if (group && group.products.length > 0) ordered.push(group);
        }
        for (const [id, group] of groups.entries()) {
            if (id === "uncategorized") continue;
            if (!ordered.find((g) => g.id === id) && group.products.length > 0) ordered.push(group);
        }
        if (groups.get("uncategorized")?.products.length) ordered.push(groups.get("uncategorized")!);
        return ordered;
    }, [products, categories, categoryMap, t]);

    // IntersectionObserver — highlight tab as sections scroll into view
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();
        if (groupedProducts.length === 0) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace("cat-", "");
                        setActiveCategory(id);
                        break;
                    }
                }
            },
            { rootMargin: "-15% 0px -80% 0px", threshold: 0 }
        );

        groupedProducts.forEach((group) => {
            const el = sectionRefs.current.get(group.id);
            if (el) observerRef.current!.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, [groupedProducts]);

    // Scroll active tab button into view in the tab bar
    useEffect(() => {
        if (activeBtnRef.current && tabsRef.current) {
            const btn = activeBtnRef.current;
            const bar = tabsRef.current;
            const btnLeft = btn.offsetLeft;
            const btnRight = btnLeft + btn.offsetWidth;
            const barScrollLeft = bar.scrollLeft;
            const barRight = barScrollLeft + bar.offsetWidth;
            if (btnLeft < barScrollLeft + 32) bar.scrollTo({ left: btnLeft - 32, behavior: "smooth" });
            else if (btnRight > barRight - 32) bar.scrollTo({ left: btnRight - bar.offsetWidth + 32, behavior: "smooth" });
        }
    }, [activeCategory]);

    const jumpToCategory = (id: string) => {
        setActiveCategory(id);
        const el = sectionRefs.current.get(id);
        if (el) {
            const stickyEl = tabsRef.current?.closest("[data-sticky]") as HTMLElement | null;
            const stickyHeight = stickyEl?.offsetHeight ?? 56;
            const top = el.getBoundingClientRect().top + window.scrollY - stickyHeight - 8;
            window.scrollTo({ top, behavior: "smooth" });
        }
    };

    const cartItems = useCartStore((s) => s.items);
    const cartTotal = useCartStore((s) => s.getTotal());
    const cartCount = useCartStore((s) => s.getItemCount());
    const hasCartItems = cartItems.some((i) => i.businessId === businessId);

    if (bizLoading) {
        return (
            <>
                <Skeleton className="h-64 w-full rounded-none" />
                <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-4">
                    <Skeleton className="h-7 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                    </div>
                </div>
            </>
        );
    }

    if (!business) {
        return (
            <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-20 text-center">
                <p className="text-[var(--muted)]">{t("business.not_found")}</p>
            </div>
        );
    }

    const prepTime = business.prepTimeOverrideMinutes ?? business.avgPrepTimeMinutes;
    const promo = business.activePromotion;

    return (
        <div>
            {/* ── Hero ─────────────────────────────────────────── */}
            <div className="relative h-56 sm:h-72 w-full bg-[var(--background-secondary)] overflow-hidden">
                {business.imageUrl ? (
                    <Image
                        src={business.imageUrl}
                        alt={business.name}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--background-secondary)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <Link
                    href="/"
                    className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
                >
                    <ArrowLeft size={18} />
                </Link>

                {!business.isOpen && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{t("restaurants.closed")}</span>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5 pt-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight drop-shadow">
                        {business.name}
                    </h1>
                    {business.description && (
                        <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{business.description}</p>
                    )}
                </div>
            </div>

            {/* ── Info strip ───────────────────────────────────── */}
            <div className="mx-auto max-w-[var(--max-content-width)] px-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 text-sm text-[var(--foreground-secondary)] border-b border-[var(--border)]">
                    {business.ratingAverage != null && business.ratingAverage > 0 && (
                        <span className="flex items-center gap-1">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-[var(--foreground)]">{business.ratingAverage.toFixed(1)}</span>
                            {business.ratingCount != null && (
                                <span className="text-[var(--muted)]">({business.ratingCount})</span>
                            )}
                        </span>
                    )}
                    {prepTime && (
                        <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {prepTime} {t("common.min")}
                        </span>
                    )}
                    {business.minOrderAmount != null && business.minOrderAmount > 0 && (
                        <span>Min. {formatPrice(business.minOrderAmount)}</span>
                    )}
                    {business.location?.address && (
                        <span className="flex items-center gap-1">
                            <MapPin size={13} />
                            {business.location.address}
                        </span>
                    )}
                    {promo && (
                        <span className="flex items-center gap-1 text-[var(--success)] font-medium">
                            <Percent size={13} />
                            {promo.name}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Sticky category bar ──────────────────────────── */}
            <div
                data-sticky
                className="sticky top-0 md:top-16 z-30 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]"
            >
                <div className="mx-auto max-w-[var(--max-content-width)] flex items-center gap-2 px-4">
                <div ref={tabsRef} className="flex-1 flex overflow-x-auto scrollbar-none">
                        {groupedProducts.map((group) => {
                            const isActive = activeCategory === group.id ||
                                (!activeCategory && groupedProducts[0]?.id === group.id);
                            return (
                                <button
                                    key={group.id}
                                    ref={isActive ? activeBtnRef : undefined}
                                    onClick={() => jumpToCategory(group.id)}
                                    className={cn(
                                        "shrink-0 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors",
                                        isActive
                                            ? "border-[var(--primary)] text-[var(--primary)]"
                                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    {group.name}
                                </button>
                            );
                        })}
                    </div>
                    {/* Search — desktop only */}
                    <div className="hidden md:block shrink-0 py-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" size={15} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`${t("market.search_products")}…`}
                                className="h-9 w-48 rounded-full border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content ──────────────────────────────────────── */}
            <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-8">
                {/* Mobile search */}
                <div className="md:hidden relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" size={15} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`${t("market.search_products")}…`}
                        className="w-full h-10 rounded-full border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>

                {productsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                    </div>
                ) : groupedProducts.length === 0 ? (
                    <div className="text-center py-16 text-[var(--muted)]">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p>{t("market.no_products")}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedProducts.map((group) => (
                            <section
                                key={group.id}
                                id={`cat-${group.id}`}
                                ref={(el) => { if (el) sectionRefs.current.set(group.id, el); }}
                            >
                                <h2 className="text-xl font-extrabold text-[var(--foreground)] mb-3">{group.name}</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {group.products.map((product: any) => {
                                        if (!product) return null;
                                        const effectivePrice = parseFloat(
                                            product.effectivePrice ?? product.markupPrice ?? product.price ?? "0"
                                        );
                                        const origPrice = product.isOnSale && product.price
                                            ? parseFloat(product.price) : null;
                                        const hasDiscount = origPrice != null && origPrice > effectivePrice;
                                        const discountPct = hasDiscount && product.saleDiscountPercentage
                                            ? Math.round(Number(product.saleDiscountPercentage)) : 0;
                                        const cartQty = cartItems
                                            .filter((ci) => ci.productId === product.id)
                                            .reduce((s, ci) => s + ci.quantity, 0);
                                        const isSoldOut = !product.isAvailable;
                                        const needsOptions = product.hasOptionGroups || product.variants?.length > 0;

                                        const handleCardClick = () => {
                                            if (isSoldOut) return;
                                            if (needsOptions) {
                                                setModalProductId(product.id);
                                            } else {
                                                useCartStore.getState().addItem({
                                                    id: `${product.id}-base-${Date.now()}`,
                                                    productId: product.id,
                                                    businessId,
                                                    businessName: business?.name ?? "",
                                                    name: product.name,
                                                    imageUrl: product.imageUrl ?? null,
                                                    unitPrice: effectivePrice,
                                                    quantity: 1,
                                                    notes: "",
                                                    selectedOptions: [],
                                                });
                                            }
                                        };

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={handleCardClick}
                                                className={cn(
                                                    "group flex gap-3 rounded-2xl bg-[var(--background-secondary)] p-3 cursor-pointer hover:brightness-95 transition-all",
                                                    isSoldOut && "opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                {/* Text side */}
                                                <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-[var(--foreground)] line-clamp-2 leading-snug">
                                                            {product.name}
                                                        </h4>
                                                        {product.description && (
                                                            <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {discountPct > 0 && (
                                                            <span className="text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded-full">
                                                                -{discountPct}%
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-bold text-[var(--foreground)]">
                                                            {formatPrice(effectivePrice)}
                                                        </span>
                                                        {hasDiscount && origPrice != null && (
                                                            <span className="text-xs text-[var(--muted)] line-through">
                                                                {formatPrice(origPrice)}
                                                            </span>
                                                        )}
                                                        {isSoldOut && (
                                                            <span className="text-xs text-[var(--danger)]">
                                                                {t("common.unavailable")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Image side */}
                                                <div className="relative shrink-0 h-[120px] w-[130px] sm:h-[140px] sm:w-[150px] rounded-xl overflow-visible bg-[var(--card)]">
                                                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                                                    {product.imageUrl ? (
                                                        <Image
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="150px"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center">
                                                            <ShoppingBag size={24} className="text-[var(--muted)] opacity-40" />
                                                        </div>
                                                    )}
                                                    </div>
                                                    {!isSoldOut && cartQty === 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                                            className="absolute -top-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg hover:opacity-80 transition-opacity z-10"
                                                        >
                                                            <Plus size={18} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {!isSoldOut && cartQty > 0 && !needsOptions && (
                                                        <div className="absolute -top-1 -right-1 flex items-center gap-1 rounded-xl bg-[var(--primary)] shadow-lg px-1.5 py-1 z-10">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const lastItem = [...cartItems].filter((ci) => ci.productId === product.id).pop();
                                                                    if (!lastItem) return;
                                                                    if (lastItem.quantity > 1) useCartStore.getState().updateQuantity(lastItem.id, lastItem.quantity - 1);
                                                                    else useCartStore.getState().removeItem(lastItem.id);
                                                                }}
                                                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 hover:bg-white/35 text-white transition-colors"
                                                            >
                                                                <Minus size={12} strokeWidth={2.5} />
                                                            </button>
                                                            <span className="min-w-[1rem] text-center text-xs font-bold text-white">{cartQty}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 hover:bg-white/35 text-white transition-colors"
                                                            >
                                                                <Plus size={12} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {!isSoldOut && cartQty > 0 && needsOptions && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                                            className="absolute -top-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg hover:opacity-80 transition-opacity z-10"
                                                        >
                                                            <span className="text-xs font-bold">{cartQty}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Cart bar ─────────────────────────────────────── */}
            <ProductOptionsModal
                productId={modalProductId}
                businessId={businessId}
                businessName={business?.name ?? ""}
                onClose={() => setModalProductId(null)}
            />


        </div>
    );
}