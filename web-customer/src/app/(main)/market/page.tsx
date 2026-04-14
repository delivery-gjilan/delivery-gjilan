"use client";

import { useTranslations } from "@/localization";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShoppingBasket, Plus, Minus, Search } from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses";
import { GET_PRODUCTS, GET_PRODUCT_CATEGORIES, GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS } from "@/graphql/operations/products/queries";
import { useCartStore } from "@/store/cartStore";
import { useSearchStore } from "@/store/searchStore";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GqlProduct, GqlBusiness, GqlProductCategory, GqlProductSubcategory } from "@/types/graphql";

function getEffectivePrice(product: GqlProduct): number {
    return Number(product.effectivePrice ?? product.price ?? product.basePrice ?? 0);
}

function getPreDiscountPrice(product: GqlProduct): number | null {
    if (product.isOnSale && product.price && product.effectivePrice) {
        const orig = Number(product.price);
        const eff = Number(product.effectivePrice);
        if (orig > eff) return orig;
    }
    return null;
}

function MarketProductCard({ product, businessId, businessName }: { product: GqlProduct; businessId: string; businessName: string }) {
    const items = useCartStore((s) => s.items);
    const addItem = useCartStore((s) => s.addItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);

    const qty = useMemo(
        () => items.filter((i) => i.productId === product.id).reduce((sum, i) => sum + i.quantity, 0),
        [items, product.id]
    );

    const effectivePrice = getEffectivePrice(product);
    const preDiscountPrice = getPreDiscountPrice(product);
    const discountPct = product.isOnSale && product.saleDiscountPercentage
        ? Math.round(Number(product.saleDiscountPercentage))
        : 0;
    const isSoldOut = !product.isAvailable;

    const handleAdd = useCallback(() => {
        if (isSoldOut) return;
        addItem({
            id: product.id,
            productId: product.id,
            businessId,
            businessName,
            name: product.name,
            imageUrl: product.imageUrl ?? null,
            unitPrice: effectivePrice,
            quantity: 1,
            notes: "",
            selectedOptions: [],
        });
    }, [isSoldOut, addItem, product, businessId, businessName, effectivePrice]);

    const handleIncrement = useCallback(() => {
        const cartItem = items.find((i) => i.productId === product.id);
        if (cartItem) updateQuantity(cartItem.id, cartItem.quantity + 1);
        else handleAdd();
    }, [items, product.id, updateQuantity, handleAdd]);
    const handleDecrement = useCallback(() => {
        const cartItem = items.find((i) => i.productId === product.id);
        if (cartItem) updateQuantity(cartItem.id, cartItem.quantity - 1);
    }, [items, product.id, updateQuantity]);

    return (
        <div className={cn(
            "rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden flex flex-col",
            isSoldOut && "opacity-60"
        )}>
            {/* Image */}
            <div className="relative w-full h-40 bg-[var(--background-secondary)]">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <ShoppingBasket size={32} className="text-[var(--muted)]" />
                    </div>
                )}
                {discountPct > 0 && (
                    <span className="absolute top-2 left-2 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        -{discountPct}%
                    </span>
                )}
                {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <span className="text-xs font-bold bg-gray-500 text-white px-3 py-1 rounded-full">SOLD OUT</span>
                    </div>
                )}
            </div>
            {/* Info */}
            <div className="p-2.5 flex flex-col gap-1 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)] leading-tight line-clamp-2 flex-1">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-[var(--primary)]">€{effectivePrice.toFixed(2)}</span>
                        {preDiscountPrice != null && (
                            <span className="text-xs line-through text-[var(--muted)]">€{preDiscountPrice.toFixed(2)}</span>
                        )}
                    </div>
                    {qty === 0 ? (
                        <button
                            onClick={handleAdd}
                            disabled={isSoldOut}
                            className="text-xs font-semibold border border-[var(--primary)] text-[var(--primary)] px-3 py-1 rounded-full hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 border border-[var(--border)] rounded-full overflow-hidden">
                            <button onClick={handleDecrement} className="w-7 h-7 flex items-center justify-center hover:bg-[var(--background-secondary)] transition-colors">
                                <Minus size={14} className="text-[var(--primary)]" />
                            </button>
                            <span className="text-sm font-bold text-[var(--foreground)] min-w-[16px] text-center">{qty}</span>
                            <button onClick={handleIncrement} className="w-7 h-7 flex items-center justify-center hover:bg-[var(--background-secondary)] transition-colors">
                                <Plus size={14} className="text-[var(--primary)]" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MarketPage() {
    const { t } = useTranslations();
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
    const [localSearch, setLocalSearch] = useState("");
    const search = useSearchStore((s) => s.query);
    const setSearchQuery = useSearchStore((s) => s.setQuery);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    // Find the MARKET business
    const { data: bizData, loading: bizLoading } = useQuery(GET_BUSINESSES, {
        fetchPolicy: "cache-first",
    });
    const marketBusiness = useMemo(() => {
        const list: any[] = (bizData as any)?.businesses ?? [];
        return list.find((b) => b.businessType === "MARKET") ?? null;
    }, [bizData]);
    const marketId = marketBusiness?.id ?? "";

    // Fetch products, categories, subcategories
    const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
        variables: { businessId: marketId },
        skip: !marketId,
        fetchPolicy: "cache-first",
    });
    const { data: categoriesData, loading: categoriesLoading } = useQuery(GET_PRODUCT_CATEGORIES, {
        variables: { businessId: marketId },
        skip: !marketId,
        fetchPolicy: "cache-first",
    });
    const { data: subcategoriesData } = useQuery(GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS, {
        variables: { businessId: marketId },
        skip: !marketId,
        fetchPolicy: "cache-first",
    });

    const allProducts: any[] = useMemo(() => (productsData as any)?.products ?? [], [productsData]);
    const categories: any[] = useMemo(() => (categoriesData as any)?.productCategories ?? [], [categoriesData]);
    const subcategories: any[] = useMemo(() => (subcategoriesData as any)?.productSubcategoriesByBusiness ?? [], [subcategoriesData]);

    // Auto-select first category
    const effectiveCategoryId = useMemo(() => {
        if (activeCategoryId) return activeCategoryId;
        return categories[0]?.id ?? null;
    }, [activeCategoryId, categories]);

    // Subcategories for active category
    const activeSubcategories = useMemo(
        () => subcategories.filter((s) => s.categoryId === effectiveCategoryId),
        [subcategories, effectiveCategoryId]
    );

    // Products for active category
    const categoryProducts = useMemo(
        () => allProducts.filter((p: any) => (p.product?.categoryId ?? p.categoryId) === effectiveCategoryId),
        [allProducts, effectiveCategoryId]
    );

    // Filter by subcategory if selected
    const visibleProducts = useMemo(() => {
        let list = categoryProducts;
        if (activeSubcategoryId) {
            list = list.filter((p: any) => (p.product?.subcategoryId ?? p.subcategoryId) === activeSubcategoryId);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((p: any) => {
                const raw = p.product ?? p;
                return raw.name?.toLowerCase().includes(q) || raw.description?.toLowerCase().includes(q);
            });
        }
        return list.sort((a: any, b: any) => (a.product?.sortOrder ?? 0) - (b.product?.sortOrder ?? 0));
    }, [categoryProducts, activeSubcategoryId, search]);

    // Search across all products
    const searchResults = useMemo(() => {
        if (!search.trim()) return null;
        const q = search.toLowerCase();
        return allProducts.filter((p: any) => {
            const raw = p.product ?? p;
            return raw.name?.toLowerCase().includes(q) || raw.description?.toLowerCase().includes(q);
        });
    }, [allProducts, search]);

    const isLoading = bizLoading || (!!marketId && (productsLoading || categoriesLoading));

    const handleCategoryClick = useCallback((id: string) => {
        setActiveCategoryId(id);
        setActiveSubcategoryId(null);
    }, []);

    const displayProducts = searchResults ?? visibleProducts;

    return (
        <div>
            {/* ── Sticky tab bar ── */}
            {categories.length > 0 && (
                <div className="sticky top-14 md:top-16 z-30 bg-[var(--background)]/95 backdrop-blur-sm">
                    <div className="mx-auto max-w-[var(--max-content-width)]">
                        {/* Category underline tabs + inline search on desktop */}
                        <div className="flex items-center overflow-x-auto scrollbar-none px-4 border-b border-[var(--border)]">
                            {/* Category tabs — hidden when searching */}
                            {!search && (
                                <div className="flex flex-1 overflow-x-auto scrollbar-none">
                                {categories.map((cat) => {
                                    const isActive = effectiveCategoryId === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={cn(
                                                "shrink-0 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors",
                                                isActive
                                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    );
                                })}
                                </div>
                            )}
                            {search && <div className="flex-1" />}
                            {/* Inline search — desktop only */}
                            <div className="hidden md:block shrink-0 py-1.5 pl-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" size={14} />
                                    <input
                                        type="search"
                                        value={localSearch}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocalSearch(val);
                                            if (debounceRef.current) clearTimeout(debounceRef.current);
                                            debounceRef.current = setTimeout(() => setSearchQuery(val.trim()), 350);
                                        }}
                                        placeholder={t("market.search_products")}
                                        className="h-9 w-44 rounded-full border border-[var(--border)] bg-[var(--card)] pl-8 pr-3 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:w-56 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Subcategory underline tabs — hidden when searching */}
                        {!search && activeSubcategories.length > 0 && (
                            <div className="flex overflow-x-auto scrollbar-none px-4 border-t border-[var(--border)]">
                                {activeSubcategories.map((sub) => {
                                    const isActive = activeSubcategoryId === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => setActiveSubcategoryId(isActive ? null : sub.id)}
                                            className={cn(
                                                "shrink-0 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
                                                isActive
                                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                            )}
                                        >
                                            {sub.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            <div className="mx-auto max-w-[var(--max-content-width)] px-4 py-6 space-y-4">

            {/* Products grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-[var(--border)] overflow-hidden">
                            <Skeleton className="h-40 w-full rounded-none" />
                            <div className="p-2.5 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !marketBusiness ? (
                <div className="text-center py-16 text-[var(--muted)]">
                    <ShoppingBasket size={40} className="mx-auto mb-3 opacity-40" />
                    <p>{t("market.no_market")}</p>
                </div>
            ) : displayProducts.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted)]">
                    <ShoppingBasket size={40} className="mx-auto mb-3 opacity-40" />
                    <p>{t("market.no_products")}</p>
                </div>
            ) : (
                <>
                    {search && (
                        <p className="text-sm text-[var(--muted)]">
                            {displayProducts.length} result{displayProducts.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
                        </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {displayProducts.map((p: any) => {
                            const raw = p.product ?? p;
                            return (
                                <MarketProductCard
                                    key={raw.id}
                                    product={raw}
                                    businessId={marketId}
                                    businessName={marketBusiness.name}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </div>
        </div>
    );
}
