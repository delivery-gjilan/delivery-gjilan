"use client";

import { useState, useMemo, useCallback } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "@/localization";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    MapPin,
    Minus,
    Plus,
    Trash2,
    Ticket,
    Loader2,
    Check,
    ChevronRight,
    Zap,
} from "lucide-react";

import { GET_MY_ADDRESSES, ADD_USER_ADDRESS } from "@/graphql/operations/addresses";
import { CALCULATE_DELIVERY_PRICE } from "@/graphql/operations/deliveryPricing";
import { VALIDATE_PROMOTIONS, GET_APPLICABLE_PROMOTIONS } from "@/graphql/operations/promotions";
import { CREATE_ORDER } from "@/graphql/operations/orders";
import { GET_SERVICE_ZONES } from "@/graphql/operations/serviceZone";
import { GET_BUSINESS_MINIMUM } from "@/graphql/operations/businesses";
import { GET_PRIORITY_SURCHARGE_AMOUNT } from "@/graphql/operations/orders";
import AddressPickerMap from "@/components/checkout/AddressPickerMap";

type CheckoutStep = 1 | 2 | 3;

interface SelectedLocation {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
    addressId?: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { t } = useTranslations();
    const { user } = useAuth();

    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const clearCart = useCartStore((s) => s.clearCart);
    const getTotal = useCartStore((s) => s.getTotal);
    const getItemCount = useCartStore((s) => s.getItemCount);

    const subtotal = getTotal();
    const itemCount = getItemCount();
    const businessIds = useMemo(
        () => Array.from(new Set(items.map((i) => i.businessId))),
        [items]
    );

    const [step, setStep] = useState<CheckoutStep>(1);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [driverNotes, setDriverNotes] = useState("");
    const [isPriority, setIsPriority] = useState(false);
    const [deliveryPrice, setDeliveryPrice] = useState(2.0);
    const [deliveryPriceLoading, setDeliveryPriceLoading] = useState(false);
    const [promoResult, setPromoResult] = useState<{
        promotionId: string | null;
        discountAmount: number;
        freeDeliveryApplied: boolean;
        effectiveDeliveryPrice: number;
        totalPrice: number;
    } | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);

    // Queries
    const { data: addressesData } = useQuery(GET_MY_ADDRESSES, { fetchPolicy: "cache-and-network" });
    const { data: zonesData } = useQuery(GET_SERVICE_ZONES, { fetchPolicy: "cache-and-network" });
    const { data: businessMinData } = useQuery(GET_BUSINESS_MINIMUM, {
        variables: { id: businessIds[0] },
        skip: !businessIds[0],
    });
    const { data: surchargeData } = useQuery(GET_PRIORITY_SURCHARGE_AMOUNT);

    const [calculateDeliveryPriceFn] = useLazyQuery(CALCULATE_DELIVERY_PRICE, { fetchPolicy: "network-only" });
    const [validatePromotionsFn, { loading: promoLoading }] = useLazyQuery(VALIDATE_PROMOTIONS, {
        fetchPolicy: "network-only",
    });
    const [createOrderMutation, { loading: orderLoading }] = useMutation(CREATE_ORDER);

    const savedAddresses = useMemo(
        () => ((addressesData as any)?.myAddresses ?? []) as any[],
        [addressesData]
    );
    const minOrderAmount = Number((businessMinData as any)?.business?.minOrderAmount ?? 0);
    const minimumMet = minOrderAmount <= 0 || subtotal >= minOrderAmount;
    const prioritySurcharge = Number((surchargeData as any)?.prioritySurchargeAmount ?? 0);

    // Cart context for promotions
    const cartContext = useMemo(
        () => ({
            items: items.map((item) => ({
                productId: item.productId,
                businessId: item.businessId,
                quantity: item.quantity,
                price: item.unitPrice,
            })),
            subtotal,
            deliveryPrice,
            businessIds,
        }),
        [items, subtotal, deliveryPrice, businessIds]
    );

    // Eligible promotions
    const { data: applicableData } = useQuery(GET_APPLICABLE_PROMOTIONS, {
        variables: { cart: cartContext },
        skip: items.length === 0,
        fetchPolicy: "cache-and-network",
    });
    const eligiblePromo = useMemo(() => {
        const list = (applicableData as any)?.getApplicablePromotions ?? [];
        return list.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))[0] ?? null;
    }, [applicableData]);

    // Final price calculations
    const effectiveDeliveryPrice = promoResult?.freeDeliveryApplied ? 0 : deliveryPrice;
    const appliedDiscount = promoResult?.discountAmount ?? 0;
    const priorityFee = isPriority ? prioritySurcharge : 0;
    const finalTotal = subtotal + effectiveDeliveryPrice + priorityFee - appliedDiscount;

    // Request delivery fee
    const requestDeliveryFee = useCallback(
        async (location: SelectedLocation) => {
            if (!businessIds[0]) return;
            setDeliveryPriceLoading(true);
            try {
                const res = await calculateDeliveryPriceFn({
                    variables: {
                        dropoffLat: location.latitude,
                        dropoffLng: location.longitude,
                        businessId: businessIds[0],
                    },
                });
                const price = (res.data as any)?.calculateDeliveryPrice?.price;
                if (price != null) setDeliveryPrice(Number(price));
            } catch {
                // keep default
            } finally {
                setDeliveryPriceLoading(false);
            }
        },
        [businessIds, calculateDeliveryPriceFn]
    );

    // Apply promo code
    const handleApplyPromo = useCallback(async () => {
        if (!couponCode.trim()) return;
        setPromoError(null);
        try {
            const res = await validatePromotionsFn({
                variables: { cart: cartContext, manualCode: couponCode.trim() },
            });
            const result = (res.data as any)?.validatePromotions;
            if (!result || (Array.isArray(result.promotions) && result.promotions.length === 0)) {
                setPromoError(t("cart.invalid_code"));
                return;
            }
            setPromoResult({
                promotionId: result.promotions?.[0]?.id ?? null,
                discountAmount: Number(result.totalDiscount ?? 0),
                freeDeliveryApplied: result.freeDeliveryApplied ?? false,
                effectiveDeliveryPrice: Number(result.finalDeliveryPrice ?? deliveryPrice),
                totalPrice: Number(result.finalTotal ?? subtotal + deliveryPrice),
            });
        } catch {
            setPromoError(t("cart.invalid_code"));
        }
    }, [couponCode, cartContext, validatePromotionsFn, t, deliveryPrice, subtotal]);

    // Select address
    const handleSelectAddress = useCallback(
        (location: SelectedLocation) => {
            setSelectedLocation(location);
            requestDeliveryFee(location);
            setStep(3);
        },
        [requestDeliveryFee]
    );

    // Select saved address
    const handleSelectSavedAddress = useCallback(
        (addr: any) => {
            const loc: SelectedLocation = {
                latitude: addr.latitude,
                longitude: addr.longitude,
                address: addr.displayName ?? addr.addressName ?? "",
                label: addr.addressName,
                addressId: addr.id,
            };
            handleSelectAddress(loc);
        },
        [handleSelectAddress]
    );

    // Place order
    const handlePlaceOrder = useCallback(async () => {
        if (!selectedLocation || items.length === 0) return;

        setOrderError(null);
        const orderItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
            notes: item.notes || null,
            selectedOptions: item.selectedOptions.map((opt) => ({
                optionGroupId: opt.optionGroupId,
                optionId: opt.optionId,
                price: opt.extraPrice > 0 ? opt.extraPrice : null,
            })),
            childItems: [],
        }));

        try {
            const result = await createOrderMutation({
                variables: {
                    input: {
                        items: orderItems,
                        dropOffLocation: {
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                            address: selectedLocation.address,
                        },
                        deliveryPrice: effectiveDeliveryPrice,
                        totalPrice: finalTotal,
                        promotionId: promoResult?.promotionId ?? null,
                        driverNotes: driverNotes || null,
                        priorityRequested: isPriority,
                        prioritySurcharge: priorityFee,
                    },
                },
            });

            const order = (result.data as any)?.createOrder;
            if (order) {
                clearCart();
                router.push(`/orders/${(order as any).id}`);
            }
        } catch (err: any) {
            setOrderError(err.message ?? t("common.error"));
        }
    }, [
        selectedLocation,
        items,
        effectiveDeliveryPrice,
        finalTotal,
        promoResult,
        driverNotes,
        isPriority,
        priorityFee,
        createOrderMutation,
        clearCart,
        router,
        t,
    ]);

    // Redirect to login if not authenticated
    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <p className="text-[var(--foreground-secondary)]">{t("auth.login_required")}</p>
                <Link href="/login">
                    <Button>{t("auth.login")}</Button>
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <p className="text-[var(--foreground-secondary)]">{t("cart.empty_message")}</p>
                <Link href="/">
                    <Button>{t("cart.start_shopping")}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => (step > 1 ? setStep((s) => (s - 1) as CheckoutStep) : router.push("/cart"))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <ArrowLeft size={16} />
                </button>
                <h1 className="text-xl font-bold text-[var(--foreground)]">{t("cart.checkout")}</h1>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                                step >= s
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-[var(--background-secondary)] text-[var(--muted)]"
                            )}
                        >
                            {step > s ? <Check size={14} /> : s}
                        </div>
                        {s < 3 && (
                            <div
                                className={cn(
                                    "h-0.5 flex-1 rounded transition-colors",
                                    step > s ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Labels */}
            <div className="flex text-xs text-[var(--muted)]">
                <span className="flex-1 text-center">{t("cart.review")}</span>
                <span className="flex-1 text-center">{t("cart.address")}</span>
                <span className="flex-1 text-center">{t("cart.confirm")}</span>
            </div>

            {/* Step 1: Cart Review */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3"
                            >
                                {item.imageUrl && (
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--background-secondary)]">
                                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.name}</p>
                                    {item.selectedOptions.length > 0 && (
                                        <p className="text-xs text-[var(--muted)] truncate">
                                            {item.selectedOptions.map((o) => o.optionName).join(", ")}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-sm font-bold">
                                            {formatPrice(
                                                (item.unitPrice + item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0)) *
                                                    item.quantity
                                            )}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {item.quantity === 1 ? (
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-[var(--danger)]"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)]"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                            )}
                                            <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)]"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Promo Code */}
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
                            <Ticket size={14} />
                            <span>{t("cart.promo_code")}</span>
                        </div>
                        {promoResult ? (
                            <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--success)]/10 border border-[var(--success)]/30 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="success">{couponCode.toUpperCase()}</Badge>
                                    <span className="text-sm text-[var(--success)] font-medium">
                                        {promoResult.freeDeliveryApplied
                                            ? t("cart.free_delivery")
                                            : `-${formatPrice(promoResult.discountAmount)}`}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setPromoResult(null);
                                        setCouponCode("");
                                    }}
                                    className="text-[var(--muted)] hover:text-[var(--foreground)]"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    value={couponCode}
                                    onChange={(e) => {
                                        setCouponCode(e.target.value.toUpperCase());
                                        setPromoError(null);
                                    }}
                                    placeholder={t("cart.enter_code")}
                                    className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                                <Button size="sm" onClick={handleApplyPromo} disabled={promoLoading || !couponCode.trim()}>
                                    {promoLoading ? <Loader2 size={14} className="animate-spin" /> : t("common.apply")}
                                </Button>
                            </div>
                        )}
                        {promoError && <p className="text-xs text-[var(--danger)]">{promoError}</p>}
                        {eligiblePromo && !promoResult && (
                            <p className="text-xs text-[var(--success)]">
                                {t("cart.eligible_promo")}: {eligiblePromo.name ?? eligiblePromo.code}
                            </p>
                        )}
                    </div>

                    {/* Minimum order warning */}
                    {!minimumMet && (
                        <p className="text-sm text-[var(--warning)] text-center">
                            {t("cart.minimum_not_met", { amount: formatPrice(minOrderAmount) })}
                        </p>
                    )}

                    <Button size="lg" className="w-full" disabled={!minimumMet} onClick={() => setStep(2)}>
                        {t("cart.continue_to_address")} · {formatPrice(subtotal)}
                    </Button>
                </div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
                <div className="space-y-4">
                    {/* Saved Addresses */}
                    {savedAddresses.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("address.saved_addresses")}</h3>
                            {savedAddresses.map((addr: any) => (
                                <button
                                    key={addr.id}
                                    onClick={() => handleSelectSavedAddress(addr)}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors",
                                        selectedLocation?.addressId === addr.id
                                            ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50"
                                    )}
                                >
                                    <MapPin size={16} className="shrink-0 text-[var(--primary)]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{addr.addressName ?? t("address.unnamed")}</p>
                                        <p className="text-xs text-[var(--muted)] truncate">{addr.displayName}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-[var(--muted)]" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Map Picker */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            {t("address.choose_on_map")}
                        </h3>
                        <AddressPickerMap
                            onSelect={handleSelectAddress}
                            initialLocation={selectedLocation}
                        />
                    </div>
                </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
                <div className="space-y-4">
                    {/* Delivery Address Summary */}
                    {selectedLocation && (
                        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="shrink-0 text-[var(--primary)] mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{selectedLocation.label ?? t("address.delivery_address")}</p>
                                    <p className="text-xs text-[var(--muted)] mt-0.5">{selectedLocation.address}</p>
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    className="text-xs text-[var(--primary)] hover:underline shrink-0"
                                >
                                    {t("common.change")}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Driver Notes */}
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">{t("cart.driver_notes")}</label>
                        <textarea
                            value={driverNotes}
                            onChange={(e) => setDriverNotes(e.target.value)}
                            placeholder={t("cart.driver_notes_placeholder")}
                            rows={2}
                            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>

                    {/* Priority Delivery */}
                    {prioritySurcharge > 0 && (
                        <button
                            onClick={() => setIsPriority(!isPriority)}
                            className={cn(
                                "flex w-full items-center justify-between rounded-[var(--radius)] border p-4 transition-colors",
                                isPriority
                                    ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                    : "border-[var(--border)] bg-[var(--card)]"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Zap size={16} className={isPriority ? "text-[var(--primary)]" : "text-[var(--muted)]"} />
                                <div className="text-left">
                                    <p className="text-sm font-medium">{t("cart.priority_delivery")}</p>
                                    <p className="text-xs text-[var(--muted)]">{t("cart.priority_description")}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-[var(--primary)]">
                                +{formatPrice(prioritySurcharge)}
                            </span>
                        </button>
                    )}

                    {/* Price Breakdown */}
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--foreground-secondary)]">{t("common.subtotal")}</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--foreground-secondary)]">{t("common.delivery")}</span>
                            {deliveryPriceLoading ? (
                                <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
                            ) : promoResult?.freeDeliveryApplied ? (
                                <div className="flex items-center gap-2">
                                    <span className="line-through text-[var(--muted)]">{formatPrice(deliveryPrice)}</span>
                                    <span className="text-[var(--success)]">{t("common.free")}</span>
                                </div>
                            ) : (
                                <span>{formatPrice(effectiveDeliveryPrice)}</span>
                            )}
                        </div>
                        {isPriority && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--foreground-secondary)]">{t("cart.priority_fee")}</span>
                                <span className="text-[var(--primary)]">+{formatPrice(priorityFee)}</span>
                            </div>
                        )}
                        {appliedDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--foreground-secondary)]">{t("cart.promo")}</span>
                                <span className="text-[var(--success)]">-{formatPrice(appliedDiscount)}</span>
                            </div>
                        )}
                        <hr className="border-[var(--border)]" />
                        <div className="flex justify-between text-base font-bold">
                            <span>{t("common.total")}</span>
                            <span>{formatPrice(finalTotal)}</span>
                        </div>
                    </div>

                    {/* Order Error */}
                    {orderError && (
                        <p className="text-sm text-[var(--danger)] text-center">{orderError}</p>
                    )}

                    {/* Place Order Button */}
                    <Button
                        size="lg"
                        className="w-full"
                        disabled={orderLoading || !selectedLocation}
                        onClick={handlePlaceOrder}
                    >
                        {orderLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                {t("cart.place_order")} · {formatPrice(finalTotal)}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
