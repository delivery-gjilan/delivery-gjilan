"use client";

import { useQuery } from "@apollo/client/react";
import { GET_PRODUCT } from "@/graphql/operations/products";
import { useCartStore, CartItemOption } from "@/store/cartStore";
import { useTranslations } from "@/localization";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Plus, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
    productId: string | null;
    businessId: string;
    businessName: string;
    onClose: () => void;
}

export function ProductOptionsModal({ productId, businessId, businessName, onClose }: Props) {
    const { t } = useTranslations();
    const addItem = useCartStore((s) => s.addItem);

    const [quantity, setQuantity] = useState(1);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

    const { data, loading } = useQuery(GET_PRODUCT, {
        variables: { id: productId! },
        skip: !productId,
        fetchPolicy: "cache-first",
    });

    const product = (data as any)?.product;

    // Reset state when product changes
    useEffect(() => {
        if (!productId) return;
        setQuantity(1);
        setSelectedVariantId(null);
        setSelectedOptions({});
    }, [productId]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    // Lock body scroll
    useEffect(() => {
        if (productId) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [productId]);

    const selectedVariant = useMemo(() => {
        if (!product?.variants?.length || !selectedVariantId) return null;
        return product.variants.find((v: any) => v.id === selectedVariantId) ?? null;
    }, [product, selectedVariantId]);

    const basePrice = useMemo(() => {
        if (selectedVariant) {
            return Number(selectedVariant.effectivePrice ?? selectedVariant.markupPrice ?? selectedVariant.price ?? 0);
        }
        if (!product) return 0;
        return Number(product.effectivePrice ?? product.markupPrice ?? product.price ?? 0);
    }, [product, selectedVariant]);

    const optionsPrice = useMemo(() => {
        if (!product?.optionGroups) return 0;
        let total = 0;
        for (const group of product.optionGroups) {
            const selected = selectedOptions[group.id] ?? [];
            for (const optId of selected) {
                const opt = group.options?.find((o: any) => o.id === optId);
                if (opt?.extraPrice) total += parseFloat(opt.extraPrice);
            }
        }
        return total;
    }, [product, selectedOptions]);

    const totalPrice = (basePrice + optionsPrice) * quantity;

    const canAdd = useMemo(() => {
        if (!product) return false;
        if (!product.isAvailable) return false;
        if (product.variants?.length && !selectedVariantId) return false;
        for (const group of product.optionGroups ?? []) {
            const min = group.minSelections ?? 0;
            if (min > 0 && (selectedOptions[group.id] ?? []).length < min) return false;
        }
        return true;
    }, [product, selectedVariantId, selectedOptions]);

    const toggleOption = useCallback((groupId: string, optionId: string, maxSelections: number) => {
        setSelectedOptions((prev) => {
            const current = prev[groupId] ?? [];
            if (current.includes(optionId)) {
                return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
            }
            if (maxSelections === 1) return { ...prev, [groupId]: [optionId] };
            if (current.length >= maxSelections) return prev;
            return { ...prev, [groupId]: [...current, optionId] };
        });
    }, []);

    const handleAddToCart = () => {
        if (!product || !canAdd) return;
        const optionsList: CartItemOption[] = [];
        for (const group of product.optionGroups ?? []) {
            const selected = selectedOptions[group.id] ?? [];
            for (const optId of selected) {
                const opt = group.options?.find((o: any) => o.id === optId);
                if (opt) {
                    optionsList.push({
                        optionGroupId: group.id,
                        optionGroupName: group.name,
                        optionId: opt.id,
                        optionName: opt.name,
                        extraPrice: Number(opt.extraPrice ?? 0),
                    });
                }
            }
        }
        addItem({
            id: `${product.id}-${selectedVariantId ?? "base"}-${Date.now()}`,
            productId: product.id,
            businessId: product.businessId ?? businessId,
            businessName,
            name: selectedVariant ? `${product.name} – ${selectedVariant.name}` : product.name,
            imageUrl: selectedVariant?.imageUrl ?? product.imageUrl,
            unitPrice: basePrice + optionsPrice,
            quantity,
            notes: "",
            selectedOptions: optionsList,
            variantId: selectedVariantId ?? undefined,
            variantName: selectedVariant?.name ?? undefined,
        });
        onClose();
    };

    if (!productId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative z-10 w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--card)] overflow-hidden shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 overscroll-contain">
                    {loading || !product ? (
                        <div className="p-5 space-y-4">
                            <Skeleton className="h-56 w-full rounded-2xl" />
                            <Skeleton className="h-7 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : (
                        <>
                            {/* Hero image */}
                            {product.imageUrl && (
                                <div className="relative h-56 w-full bg-[var(--background-secondary)] shrink-0">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 640px) 100vw, 512px"
                                        priority
                                    />
                                    {product.isOnSale && product.saleDiscountPercentage && (
                                        <span className="absolute top-3 left-3 text-xs font-bold bg-[var(--primary)] text-white px-2 py-1 rounded-full">
                                            -{Math.round(Number(product.saleDiscountPercentage))}%
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="p-5 space-y-5">
                                {/* Title + price */}
                                <div>
                                    <h2 className="text-xl font-extrabold text-[var(--foreground)] leading-tight">
                                        {product.name}
                                    </h2>
                                    {product.description && (
                                        <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">
                                            {product.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-lg font-bold text-[var(--foreground)]">
                                            {formatPrice(basePrice)}
                                        </span>
                                        {product.isOnSale && product.price && Number(product.price) > basePrice && (
                                            <span className="text-sm text-[var(--muted)] line-through">
                                                {formatPrice(Number(product.price))}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Variants */}
                                {product.variants?.length > 0 && (
                                    <div>
                                        <p className="text-sm font-bold text-[var(--foreground)] mb-2">
                                            {t("product.choose_size")}
                                            <span className="ml-1 text-xs font-normal text-[var(--danger)]">
                                                {t("product.required_badge")}
                                            </span>
                                        </p>
                                        <div className="space-y-2">
                                            {product.variants.map((v: GqlVariant) => {
                                                const vPrice = Number(v.effectivePrice ?? v.markupPrice ?? v.price ?? 0);
                                                const isSelected = selectedVariantId === v.id;
                                                return (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => setSelectedVariantId(v.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                                                            isSelected
                                                                ? "border-[var(--primary)] bg-[var(--primary)]/8"
                                                                : "border-[var(--border)] bg-[var(--background-secondary)] hover:border-[var(--primary)]/50"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "h-4 w-4 rounded-full border-2 shrink-0",
                                                                isSelected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
                                                            )} />
                                                            <span className="text-sm font-medium text-[var(--foreground)]">{v.name}</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[var(--foreground)] shrink-0">
                                                            {formatPrice(vPrice)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Option Groups */}
                                {product.optionGroups?.map((group: any) => {
                                    const selected = selectedOptions[group.id] ?? [];
                                    const isRequired = (group.minSelections ?? 0) > 0;
                                    const isSingle = group.maxSelections === 1;
                                    return (
                                        <div key={group.id}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <p className="text-sm font-bold text-[var(--foreground)]">{group.name}</p>
                                                {isRequired ? (
                                                    <span className="text-xs font-medium bg-[var(--danger)]/10 text-[var(--danger)] px-2 py-0.5 rounded-full">
                                                        {t("product.required_badge")}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-[var(--muted)]">
                                                        {t("product.optional_badge")}
                                                    </span>
                                                )}
                                                {(group.maxSelections ?? 0) > 1 && (
                                                    <span className="text-xs text-[var(--muted)] ml-auto">
                                                        {t("product.select_up_to", { max: group.maxSelections! })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {group.options?.map((opt: any) => {
                                                    const isChecked = selected.includes(opt.id);
                                                    const extraPrice = Number(opt.extraPrice ?? 0);
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => toggleOption(group.id, opt.id, group.maxSelections ?? 999)}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                                                                isChecked
                                                                    ? "border-[var(--primary)] bg-[var(--primary)]/8"
                                                                    : "border-[var(--border)] bg-[var(--background-secondary)] hover:border-[var(--primary)]/50"
                                                            )}
                                                        >
                                                            {/* Checkbox/radio indicator */}
                                                            <span className={cn(
                                                                "shrink-0 flex items-center justify-center border-2 transition-colors",
                                                                isSingle ? "h-4 w-4 rounded-full" : "h-4 w-4 rounded",
                                                                isChecked
                                                                    ? "border-[var(--primary)] bg-[var(--primary)]"
                                                                    : "border-[var(--border)] bg-transparent"
                                                            )}>
                                                                {isChecked && (
                                                                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                                                                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
                                                            </span>
                                                            <div className="flex-1 flex items-center justify-between gap-2">
                                                                <span className="text-sm text-[var(--foreground)]">{opt.name}</span>
                                                                {extraPrice > 0 && (
                                                                    <span className="text-sm font-medium text-[var(--foreground)] shrink-0">
                                                                        +{formatPrice(extraPrice)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Extra bottom padding so sticky bar doesn't overlap */}
                                <div className="h-4" />
                            </div>
                        </>
                    )}
                </div>

                {/* Sticky bottom bar */}
                {product && (
                    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-5 py-4">
                        <div className="flex items-center gap-3">
                            {/* Quantity */}
                            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background-secondary)] px-2 py-1">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--border)] transition-colors"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-5 text-center text-sm font-bold">{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--border)] transition-colors"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            {/* Add button */}
                            <button
                                onClick={handleAddToCart}
                                disabled={!canAdd}
                                className={cn(
                                    "flex-1 flex items-center justify-between rounded-2xl px-5 py-3 font-bold text-sm transition-colors",
                                    canAdd
                                        ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                                        : "bg-[var(--border)] text-[var(--muted)] cursor-not-allowed"
                                )}
                            >
                                <span>{t("cart.add_to_cart")}</span>
                                <span>{formatPrice(totalPrice)}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
