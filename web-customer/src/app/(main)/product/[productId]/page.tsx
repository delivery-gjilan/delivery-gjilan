"use client";

import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";
import { GET_PRODUCT } from "@/graphql/operations/products";
import { useTranslations } from "@/localization";
import { useCartStore, CartItem, CartItemOption } from "@/store/cartStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useMemo, use, Suspense } from "react";
import { ArrowLeft, Minus, Plus, Check } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
    return (
        <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-6 space-y-6"><Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /><Skeleton className="h-8 w-1/2" /></div>}>
            <ProductDetailContent params={params} />
        </Suspense>
    );
}

function ProductDetailContent({ params }: { params: Promise<{ productId: string }> }) {
    const { productId } = use(params);
    const searchParams = useSearchParams();
    const businessId = searchParams.get("businessId") ?? "";
    const { t } = useTranslations();

    const { data, loading } = useQuery(GET_PRODUCT, { variables: { id: productId } });
    const product = (data as any)?.product;

    const addItem = useCartStore((s) => s.addItem);
    const cartItems = useCartStore((s) => s.items);

    const [quantity, setQuantity] = useState(1);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
    const [notes, setNotes] = useState("");

    // Pick selected variant
    const selectedVariant = useMemo(() => {
        if (!product?.variants?.length) return null;
        if (selectedVariantId) return product.variants.find((v: any) => v.id === selectedVariantId) ?? null;
        return null;
    }, [product, selectedVariantId]);

    // Calculate price
    const basePrice = useMemo(() => {
        if (selectedVariant) {
            return selectedVariant.effectivePrice ?? selectedVariant.markupPrice ?? selectedVariant.price ?? 0;
        }
        if (!product) return 0;
        return product.effectivePrice ?? product.markupPrice ?? product.price ?? 0;
    }, [product, selectedVariant]);

    const optionsPrice = useMemo(() => {
        if (!product?.optionGroups) return 0;
        let total = 0;
        for (const group of product.optionGroups) {
            const selected = selectedOptions[group.id] ?? [];
            for (const optId of selected) {
                const opt = group.options?.find((o: any) => o.id === optId);
                if (opt?.extraPrice) total += opt.extraPrice;
            }
        }
        return total;
    }, [product, selectedOptions]);

    const totalPrice = (basePrice + optionsPrice) * quantity;

    // Validation
    const canAdd = useMemo(() => {
        if (!product) return false;
        if (!product.isAvailable) return false;
        if (product.variants?.length && !selectedVariantId) return false;
        // Check required option groups
        for (const group of product.optionGroups ?? []) {
            const min = group.minSelections ?? 0;
            if (min > 0) {
                const selected = selectedOptions[group.id] ?? [];
                if (selected.length < min) return false;
            }
        }
        return true;
    }, [product, selectedVariantId, selectedOptions]);

    const toggleOption = (groupId: string, optionId: string, maxSelections: number) => {
        setSelectedOptions((prev) => {
            const current = prev[groupId] ?? [];
            if (current.includes(optionId)) {
                return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
            }
            if (maxSelections === 1) {
                return { ...prev, [groupId]: [optionId] };
            }
            if (current.length >= maxSelections) return prev;
            return { ...prev, [groupId]: [...current, optionId] };
        });
    };

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
                        extraPrice: opt.extraPrice ?? 0,
                    });
                }
            }
        }

        const item: CartItem = {
            id: `${product.id}-${selectedVariantId ?? "base"}-${Date.now()}`,
            productId: product.id,
            businessId: product.businessId ?? businessId,
            businessName: "",
            name: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
            imageUrl: selectedVariant?.imageUrl ?? product.imageUrl,
            unitPrice: basePrice,
            quantity,
            notes,
            selectedOptions: optionsList,
            variantId: selectedVariantId ?? undefined,
            variantName: selectedVariant?.name ?? undefined,
        };

        addItem(item);

        // Reset
        setQuantity(1);
        setSelectedOptions({});
        setNotes("");
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
                <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center">
                <p className="text-[var(--muted)]">{t("product.not_found")}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            {/* Back */}
            <Link
                href={businessId ? `/business/${businessId}` : "/"}
                className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
                <ArrowLeft size={16} />
                {t("common.back")}
            </Link>

            {/* Product Image */}
            {product.imageUrl && (
                <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--background-secondary)]">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority
                    />
                    {product.isOnSale && (
                        <Badge variant="danger" className="absolute top-3 left-3">
                            {t("common.sale")} -{product.saleDiscountPercentage}%
                        </Badge>
                    )}
                </div>
            )}

            {/* Product Info */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">{product.name}</h1>
                {product.description && (
                    <p className="text-sm text-[var(--foreground-secondary)] mt-2">{product.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                    <span className="text-xl font-bold text-[var(--foreground)]">{formatPrice(basePrice)}</span>
                    {product.isOnSale && product.price !== basePrice && (
                        <span className="text-sm text-[var(--muted)] line-through">{formatPrice(product.price)}</span>
                    )}
                </div>
                {!product.isAvailable && (
                    <p className="text-sm text-[var(--danger)] mt-2">{t("product.unavailable_message")}</p>
                )}
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {t("product.choose_size")}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {product.variants.map((v: any) => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVariantId(v.id)}
                                className={cn(
                                    "flex items-center justify-between rounded-[var(--radius-sm)] border p-3 transition-colors",
                                    selectedVariantId === v.id
                                        ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                                )}
                            >
                                <span className="text-sm font-medium">{v.name}</span>
                                <span className="text-sm text-[var(--foreground-secondary)]">
                                    {formatPrice(v.effectivePrice ?? v.price)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Option Groups */}
            {product.optionGroups?.map((group: any) => {
                const isRequired = (group.minSelections ?? 0) > 0;
                const maxSel = group.maxSelections ?? 1;
                const selected = selectedOptions[group.id] ?? [];

                return (
                    <div key={group.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">{group.name}</h3>
                            {isRequired ? (
                                <Badge variant="danger">{t("product.required_badge")}</Badge>
                            ) : (
                                <Badge>{t("product.optional_badge")}</Badge>
                            )}
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                            {maxSel === 1 ? t("product.select_one") : t("product.select_up_to", { max: String(maxSel) })}
                        </p>
                        <div className="space-y-1.5">
                            {group.options?.map((opt: any) => {
                                const isSelected = selected.includes(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => toggleOption(group.id, opt.id, maxSel)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-[var(--radius-sm)] border p-3 transition-colors",
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                                : "border-[var(--border)] hover:border-[var(--primary)]/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                                                    isSelected
                                                        ? "border-[var(--primary)] bg-[var(--primary)]"
                                                        : "border-[var(--border)]"
                                                )}
                                            >
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className="text-sm">{opt.name}</span>
                                        </div>
                                        {opt.extraPrice > 0 && (
                                            <span className="text-xs text-[var(--foreground-secondary)]">
                                                +{formatPrice(opt.extraPrice)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Notes */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                    {t("cart.item_notes_placeholder")}
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("cart.item_notes_placeholder")}
                    rows={2}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
            </div>

            {/* Quantity + Add Button */}
            <div className="sticky bottom-20 md:bottom-0 bg-[var(--background)] border-t border-[var(--border)] -mx-4 px-4 py-4 space-y-3">
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                    >
                        <Minus size={16} />
                    </button>
                    <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                    <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <Button
                    size="lg"
                    className="w-full"
                    disabled={!canAdd}
                    onClick={handleAddToCart}
                >
                    {t("product.add_to_order")} · {formatPrice(totalPrice)}
                </Button>
            </div>
        </div>
    );
}
