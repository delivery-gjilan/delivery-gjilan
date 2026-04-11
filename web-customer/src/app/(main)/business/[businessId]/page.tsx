"use client";

import { useQuery } from "@apollo/client/react";
import { useParams } from "next/navigation";
import { GET_BUSINESS } from "@/graphql/operations/businesses";
import { GET_PRODUCTS, GET_PRODUCT_CATEGORIES } from "@/graphql/operations/products";
import { useTranslations } from "@/localization";
import { useCartStore } from "@/store/cartStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useRef, use } from "react";
import { Star, Clock, MapPin, ArrowLeft, Percent, Search } from "lucide-react";

export default function BusinessDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = use(params);
    const { t } = useTranslations();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

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
        let list = [...allProducts];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((p: any) => p.product?.name?.toLowerCase().includes(q));
        }
        if (activeCategory) {
            list = list.filter((p: any) => p.product?.categoryId === activeCategory);
        }
        return list;
    }, [allProducts, search, activeCategory]);

    const cartItems = useCartStore((s) => s.items);
    const cartTotal = useCartStore((s) => s.getTotal());
    const cartCount = useCartStore((s) => s.getItemCount());
    const hasCartItems = cartItems.some((i) => i.businessId === businessId);

    if (bizLoading) {
        return (
            <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-6">
                <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-[var(--radius)]" />
                    ))}
                </div>
            </div>
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
        <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-6">
            {/* Back + Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-[var(--foreground)]">{business.name}</h1>
                    {business.description && (
                        <p className="text-sm text-[var(--foreground-secondary)]">{business.description}</p>
                    )}
                </div>
            </div>

            {/* Hero Image */}
            {business.imageUrl && (
                <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--background-secondary)]">
                    <Image
                        src={business.imageUrl}
                        alt={business.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1200px) 100vw, 1200px"
                        priority
                    />
                    {!business.isOpen && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{t("restaurants.closed")}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Info row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-secondary)]">
                {business.ratingAverage != null && business.ratingAverage > 0 && (
                    <span className="flex items-center gap-1">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        {business.ratingAverage.toFixed(1)}
                        {business.ratingCount != null && (
                            <span className="text-[var(--muted)]">({business.ratingCount})</span>
                        )}
                    </span>
                )}
                {prepTime && (
                    <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {prepTime} {t("common.min")}
                    </span>
                )}
                {business.location?.address && (
                    <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {business.location.address}
                    </span>
                )}
                {business.minOrderAmount != null && business.minOrderAmount > 0 && (
                    <span>Min. {formatPrice(business.minOrderAmount)}</span>
                )}
            </div>

            {/* Promotion banner */}
            {promo && (
                <div className="flex items-center gap-3 rounded-[var(--radius)] bg-[var(--success-light)] border border-[var(--success)]/20 p-3">
                    <Percent size={18} className="text-[var(--success)] shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{promo.name}</p>
                        {promo.spendThreshold && (
                            <p className="text-xs text-[var(--foreground-secondary)]">
                                {t("business.free_delivery_over", {
                                    threshold: String(promo.spendThreshold),
                                })}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Search + Category Tabs */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("market.search_products")}
                        className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>

                {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={cn(
                                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                !activeCategory
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                            )}
                        >
                            {t("common.all")}
                        </button>
                        {categories.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                                    activeCategory === cat.id
                                        ? "bg-[var(--primary)] text-white"
                                        : "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Grid */}
            <div ref={menuRef}>
                {productsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted)]">
                        <p>{t("market.no_products")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map((item: any) => {
                            const product = item.product;
                            if (!product) return null;
                            const effectivePrice = product.effectivePrice ?? product.markupPrice ?? product.price;
                            const isOnSale = product.isOnSale;
                            const cartQty = cartItems.filter(
                                (ci) => ci.productId === product.id
                            ).reduce((sum, ci) => sum + ci.quantity, 0);

                            return (
                                <Link
                                    key={product.id}
                                    href={`/product/${product.id}?businessId=${businessId}`}
                                    className="group flex gap-3 rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-3 hover:shadow-sm transition-all"
                                >
                                    {/* Product Image */}
                                    <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-[var(--background-secondary)]">
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="80px"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[var(--muted)] text-xs">
                                                No img
                                            </div>
                                        )}
                                        {isOnSale && (
                                            <Badge variant="danger" className="absolute top-1 left-1 text-[10px]">
                                                {t("common.sale")}
                                            </Badge>
                                        )}
                                        {cartQty > 0 && (
                                            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                                                {cartQty}
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex flex-1 flex-col justify-between min-w-0">
                                        <div>
                                            <h4 className="font-medium text-sm text-[var(--foreground)] line-clamp-1">
                                                {product.name}
                                            </h4>
                                            {product.description && (
                                                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-0.5">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-semibold text-[var(--foreground)]">
                                                {formatPrice(effectivePrice)}
                                            </span>
                                            {isOnSale && product.price !== effectivePrice && (
                                                <span className="text-xs text-[var(--muted)] line-through">
                                                    {formatPrice(product.price)}
                                                </span>
                                            )}
                                        </div>
                                        {!product.isAvailable && (
                                            <span className="text-xs text-[var(--danger)]">
                                                {t("common.unavailable")}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Cart Bar */}
            {hasCartItems && (
                <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
                    <Link
                        href="/cart"
                        className="flex items-center justify-between rounded-2xl bg-[var(--primary)] px-5 py-3.5 text-white shadow-lg hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                {cartCount}
                            </span>
                            <span className="font-medium">{t("cart.view_cart")}</span>
                        </span>
                        <span className="font-bold">{formatPrice(cartTotal)}</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
